/**
 * Marvel Movies Home Work
 * 
 * How to run
 * k6 run demos/02-examples/movies-performance-test.js
 * 
 * INDEX=movie2 k6 run demos/02-examples/movies-performance-test.js
 * 
 */
import { sleep } from 'k6';
const credentials = {
  user: __ENV.USER ? __ENV.USER : 'defaultUser',
  pass: __ENV.PASS ? __ENV.PASS : 'defaultPass',
};
// fragments
import {deleteIndex, saveMovies, existMovies, addMovieRating} from './fragments/elasticsearch.js'
import {moviesData} from './fragments/movies-data.js'

const config = {
  elasticsearch: {
    index: __ENV.INDEX ? __ENV.INDEX : 'movies',
    host: __ENV.HOST ? __ENV.HOST : 'http://localhost:9200',
  },
}

// https://k6.io/docs/using-k6/scenarios/executors/constant-arrival-rate/#example
export let options = {
  scenarios: {
    movies: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 RPS, since timeUnit is the default 1s
      timeUnit: '1m', // 50 RPS, since timeUnit is the default 1s
      duration: '2m',
      preAllocatedVUs: 50, // how large the initial pool of VUs would be
      maxVUs: 100, // if the preAllocatedVUs are not enough, we can initialize more
      exec: 'movies', // the function this VU will execute
    },
    rating: {
      executor: 'constant-arrival-rate',
      rate: 100, // 100 RPS, since timeUnit is the default 1s
      timeUnit: '1m', // 100 RPS, since timeUnit is the default 1s
      duration: '2m',
      preAllocatedVUs: 100, // how large the initial pool of VUs would be
      maxVUs: 200, // if the preAllocatedVUs are not enough, we can initialize more
      exec: 'rating', // the function this VU will execute
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms //vzdy znamena obecne 95%
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    'delete_index_success_count': ['count==1'],
    'delete_index_error_count': ['count==0'],
  },
  // duration: '1m', //duration of test
};

export function setup() {
  console.log('Config', config)
  deleteIndex(config)
}

export function movies () {
  saveMovies(config, moviesData)

  sleep(5)
  existMovies(config, '4')
}

export function rating () {
  addMovieRating(config)

  sleep(5)
  // existMovies(config, '4')
}