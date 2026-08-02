
N = json_tree
RUBY = ruby
VERSION != grep VERSION src/$(N).js | $(RUBY) -e "puts gets.match(/VERSION = '([\d\.]+)/)[1]"
SHA != git log -1 --format="%h"
NOW != date


n:
	@echo $(N).js $(VERSION)
v:
	@echo $(VERSION)

pkg_plain:
	mkdir -p pkg
	cat src/$(N).js > pkg/$(N)-$(VERSION).js
	cat src/$(N).css > pkg/$(N)-$(VERSION).css
	echo "/* from commit $(SHA) on $(NOW) */" >> pkg/$(N)-$(VERSION).js
	echo "/* from commit $(SHA) on $(NOW) */" >> pkg/$(N)-$(VERSION).css
	cp pkg/$(N)-$(VERSION).js pkg/$(N)-$(VERSION)-$(SHA).js
	cp pkg/$(N)-$(VERSION).css pkg/$(N)-$(VERSION)-$(SHA).css
pkg: pkg_plain

clean:
	rm -fR pkg/

serve: # just for test/index.html
	@echo "##"
	@echo "## head for http://localhost:7001/index.html"
	@echo "##"
	$(RUBY) -run -ehttpd test -p7001
s: serve


.PHONY: pkg clean serve

