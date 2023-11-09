import http from 'k6/http';
import { check, fail, group } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';
import { Counter } from 'k6/metrics';

const deleteIndexSuccessCount = new Counter('delete_index_success_count');
const deleteIndexErrorCount = new Counter('delete_index_error_count')

const rateGetMoviesIterations = new Counter('rate_get_movies_iteration_count');
const rateGetMoviesSuccessCount = new Counter('rate_get_movies_success_count');
const rateGetMoviesErrorCount = new Counter('rate_get_movies_error_count');

const rateRatingIterations = new Counter('save_rating_iteration_count');
const rateRatingSuccessCount = new Counter('save_rating_success_count');
const rateRatingErrorCount = new Counter('save_rating_error_count'); // custom metric to count errors

// const saveMovieIterations = new Counter('save_movie_iteration_count');
// const saveMovieSuccessRatingCount = new Counter('save_movie_success_count');
// const saveMovieErrorCount = new Counter('save_movie_error_count'); // custom metric to count errors when saving movies

const deleteIndex = function(config = fail(`missing config.`)) {
  const { host, index } = config.elasticsearch

  group(`Delete index ${index}`, function () {
    let res = http.get(`${host}/${index}`);

    if (res.status === 200) {
      // delete index movies
      res = http.del(`${host}/${index}`);
      // check that index is deleted
      let rs = check(res, {
        'status was 200': (r) => r.status === 200,
        'Response message 200 OK': (r) => r.status_text === '200 OK'
      });
      if(!rs){
        deleteIndexErrorCount.add(1)
      }
      else {
        deleteIndexSuccessCount.add(1)
      }
    }
    else {
      deleteIndexSuccessCount.add(1)
    }
  })
}

const saveMovies = function(config = fail(`missing config.`), movies = fail(`missing movies.`)) {
  const { host, index } = config.elasticsearch

  group(`Save movies to Elasticsearch`, function () {
    for (let movie of movies) {
      let res = http.post(`${host}/${index}/_doc/${uuidv4()}`, JSON.stringify(movie), { headers: { 'Content-Type': 'application/json' } });

      check(res, {
        'status was 201': (r) => r.status === 201,
        'Response message 201 Created': (r) => r.status_text === '201 Created'
      });

      rateRatingIterations.add(1)
      if(!check){
        return rateRatingErrorCount.add(1)
      }
      return rateRatingSuccessCount.add(1)
    }
  })
}

const existMovies = function(config = fail(`missing config.`), exactlyCount = fail(`missing exactlyCount.`)) {
  const { host } = config.elasticsearch

  group(`Exist ${exactlyCount} movies in Elasticsearch`, function () {
    let res = http.get(`${host}/_cat/indices?format=json&pretty=true`);
    check(res, {
      'status was 200': (r) => r.status === 200,
      // 'index movies contains four records': (r) => r.json()[0]['docs.count'] === `${exactlyCount}`,
    });
  });
}

//create function to add movie rating to index movies
export function addMovieRating(config = fail(`missing config.`)) {
  const { host , index } = config.elasticsearch

  group(`movie rating`, function () {

    let res = http.get(`${host}/${index}/_search?pretty=true`);

    group(`get all movies from index`, function () {
      //console.log(res.json());
      check(res, {
        'status was 200 or 404': (r) => r.status === 200 || r.status === 404,
      });

      rateGetMoviesIterations.add(1)
      if(res.status !== 200){
        return rateGetMoviesErrorCount.add(1)
      }
      rateGetMoviesSuccessCount.add(1)
    });

    //return movie data from response into console
    if (res.status === 200) {
      let res_movies = res.json().hits.hits;

      let num_movies = res_movies.length;
      if (num_movies === 0) {
        return rateRatingErrorCount.add(1)
      }

      //get random index from num_movies
      let randomIndex = Math.floor(Math.random() * num_movies);

      //add rating to movie
      group(`add rating to movie`, function () {
        let rating = Math.floor(Math.random() * 10);
        let res = http.post(`${host}/${index}/_update/${res_movies[randomIndex]._id}`, JSON.stringify({ "doc": { "rating": rating } }), { headers: { 'Content-Type': 'application/json' } });
        //check that rating is added, and status is 200
        let rs = check(res, {
          'status was 200': (r) => r.status === 200,
          'Response message 200 OK': (r) => r.status_text === '200 OK'
        });

        rateRatingIterations.add(1)
        if(!rs){
          return rateRatingErrorCount.add(1)
        }
        return rateRatingSuccessCount.add(1)
      });
    }
  });
}

module.exports = {
  deleteIndex,
  saveMovies,
  existMovies,
  addMovieRating
}