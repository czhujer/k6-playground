.PHONY: run-w-restart
run-w-restart:
	watchexec -- docker-compose restart
