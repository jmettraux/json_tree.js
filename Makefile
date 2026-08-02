
N = json_tree
RUBY = ruby
VERSION != grep VERSION src/$(N).js | $(RUBY) -e "puts gets.match(/VERSION = '([\d\.]+)/)[1]"
SHA != git log -1 --format="%h"
NOW != date


n:
	@echo $(N).js $(VERSION)
v:
	@echo $(VERSION)

serve: # just for test/index.html
	@echo "##"
	@echo "## head for http://localhost:7001/index.html"
	@echo "##"
	$(RUBY) -run -ehttpd test -p7001
s: serve


.PHONY: pkg clean serve

