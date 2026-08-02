/**
 * JSON Tree library (a part of jsonTreeViewer)
 * http://github.com/summerstyle/jsonTreeViewer
 *
 * Copyright 2017 Vera Lobacheva (http://iamvera.com)
 * Released under the MIT license (LICENSE.txt)
 *
 * Copyright 2026 John Mettraux (https://github.com/jmettraux)
 * https://github.com/jmettraux/json_tree.js
 */

let JsonTree = (function() {

  /* ---------- Utilities ---------- */
  let utils = {

    isDomElement : function(o) {

      return (
        (o !== null) &&
        (typeof o === 'object') &&
        (typeof o.tagName === 'string') &&
        (typeof o.getElementsByClassName === 'function'));
    },

    /*
     * Returns js-"class" of value
     *
     * @param val {any type} - value
     * @returns {string} - for example, "[object Function]"
     */
    getClass : function(val) {

      return Object.prototype.toString.call(val);
    },

    /**
     * Checks for a type of value (for valid JSON data types).
     * In other cases - throws an exception
     *
     * @param val {any type} - the value for new node
     * @returns {string} ("object" | "array" | "null" | "boolean" | "number" | "string")
     */
    getType : function(val) {

      if (val === null) return 'null';
      if (Array.isArray(val)) return 'array';

      let t = typeof val;
      switch (t) {
        case 'number':
        case 'string':
        case 'boolean': return t;
      }

      let c = utils.getClass(val);

      if (c === '[object Object]') return 'object';

      throw new Error(`Bad type: ${c}`);
    },

    /**
     * Applies for each item of list some function
     * and checks for last element of the list
     *
     * @param obj {Object | Array} - a list or a dict with child nodes
     * @param func {Function} - the function for each item
     */
    forEachNode : function(obj, func) {

      let type = utils.getType(obj),
        isLast;

      switch (type) {
        case 'array':

          isLast = obj.length - 1;

          obj.forEach(function(item, i) {
            func(i, item, i === isLast);
          });

          break;

        case 'object':

          let keys = Object.keys(obj).sort();

          isLast = keys.length - 1;

          keys.forEach(function(item, i) {
            func(item, obj[item], i === isLast);
          });

          break;
      }
    },

    /**
     * Implements the kind of an inheritance by
     * using parent prototype and
     * creating intermediate constructor
     *
     * @param Child {Function} - a child constructor
     * @param Parent {Function} - a parent constructor
     */
    inherits : (function() {

      let F = function() {};

      return function(Child, Parent) {
        F.prototype = Parent.prototype;
        Child.prototype = new F();
        Child.prototype.constructor = Child;
      };
    })(),

    /**
     * Extends some object
     */
    extend : function(targetObj, sourceObj) {

      for (let prop in sourceObj) {
        if (sourceObj.hasOwnProperty(prop)) {
          targetObj[prop] = sourceObj[prop];
        }
      }
    }
  };


  /* ---------- Node constructors ---------- */

  /**
   * The factory for creating nodes of defined type.
   *
   * ~~~ Node ~~~ is a structure element of an onject or an array
   * with own label (a key of an object or an index of an array)
   * and value of any json data type. The root object or array
   * is a node without label.
   * {...
   * [+] "label": value,
   * ...}
   *
   * Markup:
   * <li class="json_tree_node [json_tree_node_expanded]">
   *   <span class="json_tree_label-wrapper">
   *     <span class="json_tree_label">
   *       <span class="json_tree_expand-button" />
   *       "label"
   *     </span>
   *     :
   *   </span>
   *   <(div|span) class="json_tree_value json_tree_value_(object|array|boolean|null|number|string)">
   *     ...
   *   </(div|span)>
   * </li>
   *
   * @param label {string} - key name
   * @param val {Object | Array | string | number | boolean | null} - a value of node
   * @param isLast {boolean} - true if node is last in list of siblings
   *
   * @return {Node}
   */
  function Node(label, val, isLast) {

    let nodeType = utils.getType(val);

    if (nodeType in Node.CONSTRUCTORS) {
      return new Node.CONSTRUCTORS[nodeType](label, val, isLast);
    }
    throw new Error('Bad type: ' + utils.getClass(val));
  }

  Node.CONSTRUCTORS = {
    'boolean' : NodeBoolean,
    'number'  : NodeNumber,
    'string'  : NodeString,
    'null'    : NodeNull,
    'object'  : NodeObject,
    'array'   : NodeArray };


  /*
   * The constructor for simple types (string, number, boolean, null)
   * {...
   * [+] "label": value,
   * ...}
   * value = string || number || boolean || null
   *
   * Markup:
   * <li class="json_tree_node">
   *   <span class="json_tree_label-wrapper">
   *     <span class="json_tree_label">"age"</span>
   *     :
   *   </span>
   *   <span class="json_tree_value json_tree_value_(number|boolean|string|null)">25</span>
   *   ,
   * </li>
   *
   * @abstract
   * @param label {string} - key name
   * @param val {string | number | boolean | null} - a value of simple types
   * @param isLast {boolean} - true if node is last in list of parent childNodes
   */
  function _NodeSimple(label, val, isLast) {

    if (this.constructor === _NodeSimple) {
      throw new Error('This is abstract class');
    }

    let self = this,
      el = document.createElement('li'),
      labelEl,
      template = function(label, val) {
        let str = '\
          <span class="json_tree_label-wrapper">\
            <span class="json_tree_label">"' +
              label +
            '"</span> : \
          </span>\
          <span class="json_tree_value-wrapper">\
            <span class="json_tree_value json_tree_value_' + self.type + '">' +
              val +
            '</span>' +
            (!isLast ? ',' : '') +
          '</span>';

        return str;
      };

    self.label = label;
    self.isComplex = false;

    el.classList.add('json_tree_node');
    el.innerHTML = template(label, val);

    self.el = el;

    labelEl = el.querySelector('.json_tree_label');

    labelEl.addEventListener('click', function(ev) {

      if (ev.altKey) {
        self.toggleMarked();
        return;
      }

      if (ev.shiftKey) {
        document.getSelection().removeAllRanges();
        alert(self.getJSONPath());
        return;
      }
    }, false);
  }

  _NodeSimple.prototype = {

    constructor : _NodeSimple,

    /**
     * Mark node
     */
    mark : function() {
      this.el.classList.add('json_tree_node_marked'); },

    /**
     * Unmark node
     */
    unmark : function() {
      this.el.classList.remove('json_tree_node_marked'); },

    /**
     * Mark or unmark node
     */
    toggleMarked : function() {
      this.el.classList.toggle('json_tree_node_marked'); },

    /**
     * Expands parent node of this node
     *
     * @param isRecursive {boolean} - if true, expands all parent nodes
     *                (from node to root)
     */
    expandParent : function(isRecursive) {
      if ( ! this.parent) return;
      this.parent.expand();
      this.parent.expandParent(isRecursive);
    },

    /**
     * Returns JSON-path of this
     *
     * @returns {string}
     */
    getJSONPath : function() {

      return(
        this.isRoot ? '$' :
        this.parent.getJSONPath() + `[${this.label}]`);
    },

    /**
     * Returns JSON-path of this (dot not bracket variant)
     *
     * @returns {string}
     */
    getJsPath : function() {

      if (this.isRoot) return '$';

      return(
        this.parent.getJsPath() + (
          this.parent.type === 'array' ? `[${this.label}]` :
          `.${this.label}`));
    }
  };


  /*
   * The constructor for boolean values
   * {...
   * [+] "label": boolean,
   * ...}
   * boolean = true || false
   *
   * @constructor
   * @param label {string} - key name
   * @param val {boolean} - value of boolean type, true or false
   * @param isLast {boolean} - true if node is last in list of parent childNodes
   */
  function NodeBoolean(label, val, isLast) {

    this.type = "boolean";

    _NodeSimple.call(this, label, val, isLast);
  }
  utils.inherits(NodeBoolean,_NodeSimple);


  /*
   * The constructor for number values
   * {...
   * [+] "label": number,
   * ...}
   * number = 123
   *
   * @constructor
   * @param label {string} - key name
   * @param val {number} - value of number type, for example 123
   * @param isLast {boolean} - true if node is last in list of parent childNodes
   */
  function NodeNumber(label, val, isLast) {

    this.type = "number";

    _NodeSimple.call(this, label, val, isLast);
  }
  utils.inherits(NodeNumber,_NodeSimple);


  /*
   * The constructor for string values
   * {...
   * [+] "label": string,
   * ...}
   * string = "abc"
   *
   * @constructor
   * @param label {string} - key name
   * @param val {string} - value of string type, for example "abc"
   * @param isLast {boolean} - true if node is last in list of parent childNodes
   */
  function NodeString(label, val, isLast) {

    this.type = "string";

    _NodeSimple.call(this, label, `"${val}"`, isLast);
  }
  utils.inherits(NodeString,_NodeSimple);


  /*
   * The constructor for null values
   * {...
   * [+] "label": null,
   * ...}
   *
   * @constructor
   * @param label {string} - key name
   * @param val {null} - value (only null)
   * @param isLast {boolean} - true if node is last in list of parent childNodes
   */
  function NodeNull(label, val, isLast) {

    this.type = "null";

    _NodeSimple.call(this, label, val, isLast);
  }
  utils.inherits(NodeNull,_NodeSimple);


  /*
   * The constructor for complex types (object, array)
   * {...
   * [+] "label": value,
   * ...}
   * value = object || array
   *
   * Markup:
   * <li class="json_tree_node json_tree_node_(object|array) [expanded]">
   *   <span class="json_tree_label-wrapper">
   *     <span class="json_tree_label">
   *       <span class="json_tree_expand-button" />
   *       "label"
   *     </span>
   *     :
   *   </span>
   *   <div class="json_tree_value">
   *     <b>{</b>
   *     <ul class="json_tree_child-nodes" />
   *     <b>}</b>
   *     ,
   *   </div>
   * </li>
   *
   * @abstract
   * @param label {string} - key name
   * @param val {Object | Array} - a value of complex types, object or array
   * @param isLast {boolean} - true if node is last in list of parent childNodes
   */
  function _NodeComplex(label, val, isLast) {

    if (this.constructor === _NodeComplex) {
      throw new Error('This is abstract class');
    }

    let self = this,
      el = document.createElement('li'),
      template = function(label, sym) {
        let comma = ( ! isLast) ? ',' : '',
          str = '\
            <div class="json_tree_value-wrapper">\
              <div class="json_tree_value json_tree_value_' + self.type + '">\
                <b>' + sym[0] + '</b>\
                <span class="json_tree_show-more">&hellip;</span>\
                <ul class="json_tree_child-nodes"></ul>\
                <b>' + sym[1] + '</b>' +
              '</div>' + comma +
            '</div>';

        if (label !== null) {
          str = '\
            <span class="json_tree_label-wrapper">\
              <span class="json_tree_label">' +
                '<span class="json_tree_expand-button"></span>' +
                '"' + label +
              '"</span> : \
            </span>' + str;
        }

        return str;
      },
      childNodesUl,
      labelEl,
      moreContentEl,
      childNodes = [];

    self.label = label;
    self.isComplex = true;

    el.classList.add('json_tree_node');
    el.classList.add('json_tree_node_complex');
    el.innerHTML = template(label, self.sym);

    childNodesUl = el.querySelector('.json_tree_child-nodes');

    if (label !== null) {

      labelEl = el.querySelector('.json_tree_label');
      moreContentEl = el.querySelector('.json_tree_show-more');

      labelEl.addEventListener('click', function(ev) {

        if (ev.altKey) {
          self.toggleMarked();
          return;
        }

        if (ev.shiftKey) {
          document.getSelection().removeAllRanges();
          alert(self.getJSONPath());
          return;
        }

        self.toggle(ev.ctrlKey || ev.metaKey);
      }, false);

      moreContentEl.addEventListener('click', function(ev) {

        self.toggle(ev.ctrlKey || ev.metaKey);
      }, false);

      self.isRoot = false;

    } else {

      self.isRoot = true;
      self.parent = null;

      el.classList.add('json_tree_node_expanded');
    }

    self.el = el;
    self.childNodes = childNodes;
    self.childNodesUl = childNodesUl;

    utils.forEachNode(val, function(label, node, isLast) {
      self.addChild(new Node(label, node, isLast));
    });

    self.isEmpty = !Boolean(childNodes.length);
    if (self.isEmpty) {
      el.classList.add('json_tree_node_empty');
    }
  }

  utils.inherits(_NodeComplex, _NodeSimple);

  utils.extend(_NodeComplex.prototype, {
    constructor : _NodeComplex,

    /*
     * Add child node to list of child nodes
     *
     * @param child {Node} - child node
     */
    addChild : function(child) {
      this.childNodes.push(child);
      this.childNodesUl.appendChild(child.el);
      child.parent = this;
    },

    /*
     * Expands this list of node child nodes
     *
     * @param isRecursive {boolean} - if true, expands all child nodes
     */
    expand : function(isRecursive){
      if (this.isEmpty) {
        return;
      }

      if (!this.isRoot) {
        this.el.classList.add('json_tree_node_expanded');
      }

      if (isRecursive) {
        this.childNodes.forEach(function(item, i) {
          if (item.isComplex) {
            item.expand(isRecursive);
          }
        });
      }
    },

    /*
     * Collapses this list of node child nodes
     *
     * @param isRecursive {boolean} - if true, collapses all child nodes
     */
    collapse : function(isRecursive) {
      if (this.isEmpty) {
        return;
      }

      if (!this.isRoot) {
        this.el.classList.remove('json_tree_node_expanded');
      }

      if (isRecursive) {
        this.childNodes.forEach(function(item, i) {
          if (item.isComplex) {
            item.collapse(isRecursive);
          }
        });
      }
    },

    /*
     * Expands collapsed or collapses expanded node
     *
     * @param {boolean} isRecursive - Expand all child nodes if this node is expanded
     *                and collapse it otherwise
     */
    toggle : function(isRecursive) {
      if (this.isEmpty) {
        return;
      }

      this.el.classList.toggle('json_tree_node_expanded');

      if (isRecursive) {
        let isExpanded = this.el.classList.contains('json_tree_node_expanded');

        this.childNodes.forEach(function(item, i) {
          if (item.isComplex) {
            item[isExpanded ? 'expand' : 'collapse'](isRecursive);
          }
        });
      }
    },

    /**
     * Find child nodes that match some conditions and handle it
     *
     * @param {Function} matcher
     * @param {Function} handler
     * @param {boolean} isRecursive
     */
    findChildren : function(matcher, handler, isRecursive) {
      if (this.isEmpty) {
        return;
      }

      this.childNodes.forEach(function(item, i) {
        if (matcher(item)) {
          handler(item);
        }

        if (item.isComplex && isRecursive) {
          item.findChildren(matcher, handler, isRecursive);
        }
      });
    }
  });


  /*
   * The constructor for object values
   * {...
   * [+] "label": object,
   * ...}
   * object = {"abc": "def"}
   *
   * @constructor
   * @param label {string} - key name
   * @param val {Object} - value of object type, {"abc": "def"}
   * @param isLast {boolean} - true if node is last in list of siblings
   */
  function NodeObject(label, val, isLast) {
    this.sym = ['{', '}'];
    this.type = "object";

    _NodeComplex.call(this, label, val, isLast);
  }
  utils.inherits(NodeObject,_NodeComplex);


  /*
   * The constructor for array values
   * {...
   * [+] "label": array,
   * ...}
   * array = [1,2,3]
   *
   * @constructor
   * @param label {string} - key name
   * @param val {Array} - value of array type, [1,2,3]
   * @param isLast {boolean} - true if node is last in list of siblings
   */
  function NodeArray(label, val, isLast) {
    this.sym = ['[', ']'];
    this.type = "array";

    _NodeComplex.call(this, label, val, isLast);
  }
  utils.inherits(NodeArray, _NodeComplex);


  /* ---------- The tree constructor ---------- */

  /*
   * The constructor for json tree.
   * It contains only one Node (Array or Object), without property name.
   * CSS-styles of .tree define main tree styles like font-family,
   * font-size and own margins.
   *
   * Markup:
   * <ul class="json_tree_tree clearfix">
   *   {Node}
   * </ul>
   *
   * @constructor
   * @param jsonObj {Object | Array} - data for tree
   * @param domEl {DOMElement} - DOM-element, wrapper for tree
   */
  function Tree(jsonObj, domEl) {
    this.wrapper = document.createElement('ul');
    this.wrapper.className = 'json_tree_tree clearfix';

    this.rootNode = null;

    this.sourceJSONObj = jsonObj;

    this.loadData(jsonObj);
    this.appendTo(domEl);
  }

  Tree.prototype = {
    constructor : Tree,

    /**
     * Fill new data in current json tree
     *
     * @param {Object | Array} jsonObj - json-data
     */
    loadData : function(jsonObj) {

      let rootType = utils.getType(jsonObj);

      if (rootType !== 'object' && rootType !== 'array') {
        throw new Error(
          `JsonTree - root not object or array but "${rootType}"`);
      }

      this.sourceJSONObj = jsonObj;

      this.rootNode = new Node(null, jsonObj, 'last');
      this.wrapper.innerHTML = '';
      this.wrapper.appendChild(this.rootNode.el);
    },

    /**
     * Appends tree to DOM-element (or move it to new place)
     *
     * @param {DOMElement} domEl
     */
    appendTo : function(domEl) {
      domEl.appendChild(this.wrapper);
    },

    /**
     * Expands all tree nodes (objects or arrays) recursively
     *
     * @param {Function} filterFunc - 'true' if this node should be expanded
     */
    expand : function(filterFunc) {
      if (this.rootNode.isComplex) {
        if (typeof filterFunc == 'function') {
          this.rootNode.childNodes.forEach(function(item, i) {
            if (item.isComplex && filterFunc(item)) {
              item.expand();
            }
          });
        } else {
          this.rootNode.expand('recursive');
        }
      }
    },

    /**
     * Collapses all tree nodes (objects or arrays) recursively
     */
    collapse : function() {
      if (typeof this.rootNode.collapse === 'function') {
        this.rootNode.collapse('recursive');
      }
    },

    /**
     * Returns the source json-string (pretty-printed)
     *
     * @param {boolean} isPrettyPrinted - 'true' for pretty-printed string
     * @returns {string} - for exemple, '{"a":2,"b":3}'
     */
    toSourceJSON : function(isPrettyPrinted) {

      if ( ! isPrettyPrinted) {
        return JSON.stringify(this.sourceJSONObj);
      }

      let DELIMETER = "[%^$#$%^%]",
        jsonStr = JSON.stringify(this.sourceJSONObj, null, DELIMETER);

      jsonStr = jsonStr.split("\n").join("<br />");
      jsonStr = jsonStr.split(DELIMETER).join("&nbsp;&nbsp;&nbsp;&nbsp;");

      return jsonStr;
    },

    /**
     * Find all nodes that match some conditions and handle it
     */
    findAndHandle : function(matcher, handler) {
      this.rootNode.findChildren(matcher, handler, 'isRecursive');
    },

    /**
     * Unmark all nodes
     */
    unmarkAll : function() {
      this.rootNode.findChildren(function(node) {
        return true;
      }, function(node) {
        node.unmark();
      }, 'isRecursive');
    }
  };


  /* ---------- Public methods ---------- */
  return {

    /**
     * Creates new tree by data and appends it to the DOM-element
     *
     * @param jsonObj {Object | Array} - json-data
     * @param domEl {DOMElement} - the wrapper element
     * @returns {Tree}
     */
    create : function(/*jsonObj, domEl*/) {

      let a = Array.from(arguments);
      let e = a.find(function(e) { return utils.isDomElement(e); });
      let j = a.find(function(e) { return ! utils.isDomElement(e); });

      return new Tree(j, e);
    }
  };
})();

