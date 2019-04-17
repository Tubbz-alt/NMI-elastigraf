"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ElastiGrafCtrl = void 0;

var _sdk = require("app/plugins/sdk");

var _moment = _interopRequireDefault(require("moment"));

require("./ElastiGraf-panel.css!");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var ElastiGrafCtrl =
/*#__PURE__*/
function (_PanelCtrl) {
  _inherits(ElastiGrafCtrl, _PanelCtrl);

  function ElastiGrafCtrl($scope, $injector) {
    var _this;

    _classCallCheck(this, ElastiGrafCtrl);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(ElastiGrafCtrl).call(this, $scope, $injector));
    _this.idx = 0;
    _this.output = "<empty>";

    _this.updateContent();

    _this.templateSrv = $injector.get('templateSrv');
    _this.previousQuery = "";
    _this.callDeltaMs = 5000; // variable used in Edit -> Options 

    _this.lastCallTime = null; // Variable holdig either the value coming from a TemplateVariable
    // or, if that is not avialable, corresponding to "this.defaultQuery". 

    _this.query = "";
    _this.status = "IDLE"; // variable user in Panel 

    _this.heart = "O"; // used in Edit -> Options 

    _this.url = "http://localhost:19200/lclslogs/_search"; // used in Edit -> Options 
    // useful if the Grafana Template Variable 'lquery' has not 
    // be defined. In such cases defaultQuery is used.

    _this.defaultQuery = "nmingott AND psmetric01";
    _this.defaultElasticCall = "{\"size\": 20,\n  \"query\": { \n    \"bool\": { \n     \"must\": { \n      \"query_string\": { \n         \"default_field\" : \"src\", \n         \"query\"         : \"* AND ( HERE_LUCENEQ )\"\n                       }\n             }, \n      \"filter\": { \n        \"range\": { \n          \"date\": { \n            \"gt\" : \"0\", \n            \"lt\" : maxTime \n                  } \n                 }\n                }\n             } \n          },\n      \"sort\": {\"date\": {\"order\": \"desc\"}}  \n}"; // Default variable string containing a function to translate JSON
    // to HTML.

    _this.defaultConvertJSONtoText = "function(data) {\n   var outVals = data[\"hits\"][\"hits\"];\n   var outHTML = \"<ul id='resultsList'>\";\n   if (outVals.length === 0) { \n     outHTML = \"<span class='errorString'><b>No Match</b></span>\";\n   } else {\n     for(var i=0; i<outVals.length; i++) {\n       var el = outVals[i];\n       var elStr = el[\"_source\"][\"src\"];\n       outHTML = outHTML + \"<li class='resultItem'>\" + elStr;\n     }\n     outHTML = outHTML + \"</ul>\";\t\t    \n   }\n   return(outHTML);\n   }"; // To define our "Edit Mode" parameters

    _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_assertThisInitialized(_this)));

    return _this;
  } // function to conver the response from Elasticsearch to 
  // human readable HTML code. The data "jData" is supposed to be 
  // encoded in a Javascript data structure.


  _createClass(ElastiGrafCtrl, [{
    key: "jsonToHtml",
    value: function jsonToHtml(jData) {
      var outHTML = "";

      if (this.defaultConvertJSONtoText === "") {
        outHTML = "<pre>" + JSON.stringify(jData, null, 3) + "</pre>";
        return outHTML;
      } // Try to run the user give filer. On error print the pretty JSON format      


      try {
        // console.log(`${this.defaultConvertJSONtoText}`);
        // console.log(JSON.stringify(jData));
        outHTML = eval("( ".concat(this.defaultConvertJSONtoText, " )"))(jData);
      } catch (err) {
        outHTML = "<pre> Error in JSON to HTML conversion: \n";
        outHTML += err;
        outHTML += "\n--- default JSON output ----\n";
        outHTML += JSON.stringify(jData, null, 3) + "</pre>";
      }

      return outHTML;
    } // Ajax call to Elasticsearch and set global variables either directly
    // or after a callback.

  }, {
    key: "remoteCall",
    value: function remoteCall(d) {
      // synonim for "this" to be used later. 
      var that = this;
      var epochMs = new Date().valueOf(); // .Run the ajax call, if the queryStr is new stuff 
      // .It is supposed the call is made by the browser, so 
      //  it must be possible for the user computer to access 
      //  Elasticsearch.

      if (this.status === "WAIT-RESPONSE") {
        // console.log("DBG> --- stop call, wait response");
        return;
      }

      if (this.lastCallTime !== null && epochMs - this.lastCallTime <= this.callDeltaMs) {
        this.status = "IDLE";
        return;
      }

      this.status = "WAIT-RESPONSE"; // console.log("DBG> WAIT-RESPONSE");

      this.lastCallTime = epochMs;
      $.ajax({
        type: "POST",
        dataType: "json",
        contentType: "application/json",
        // url:"http://localhost:19200/lclslogs/_search", 
        url: that.url,
        cache: false,
        data: JSON.stringify(d),
        success: function success(data) {
          // build the HTML output from Elasticsearch json response 
          var outHTML = "";

          try {
            outHTML = that.jsonToHtml(data);
          } catch (err) {
            console.log("error: " + err);
            outHTML = ". . .";
          } // console.log(outHTML);


          that.output = outHTML; //

          that.status = "IDLE"; // console.log("DBG> IDLE");
          // that.$timeout( () => { that.updateContent(); }, that.waitMs );
        },
        error: function error(data) {
          // 
          that.status = "IDLE"; // console.log("DBG> IDLE");
          // that.$timeout( () => { that.updateContent(); }, that.waitMs );
        }
      });
    }
  }, {
    key: "updateContent",
    value: function updateContent() {
      var _this2 = this;

      this.value = "foo bar: " + (0, _moment["default"])().format('hh:mm:ss'); // synonim for "this" to be used later. 

      var that = this; // get the value of queryStr from the interface 

      var queryStr = "";

      try {
        var templateSrv = this.templateSrv;
        queryStr = templateSrv.replace('$lquery'); // console.log("DBG> lquery: " + JSON.stringify(queryStr));

        if (queryStr !== '$lquery') {
          this.query = queryStr;
        } else {
          this.query = this.defaultQuery;
        } // console.log("v1: " + queryStr);

      } catch (err) {} // console.log("error: " + err);
      // update the value of the heartbeat letter: "o" OR "O".


      this.idx = this.idx + 1;

      if (this.idx % 2 == 0) {
        this.heart = "O";
      } else {
        this.heart = "o";
      }

      var maxTime = new Date().valueOf() + ""; // Replace strings in the query and parse it.

      var d0, d1, d;

      try {
        d0 = that.defaultElasticCall;
        d1 = d0.replace(/HERE_LUCENEQ/, this.query);
        d1 = d1.replace(/maxTime/, maxTime);
        d = JSON.parse(d1); // console.log(d);
      } catch (err) {
        console.log("error" + err);
        console.log(d1);
        d = {
          "V": "to be parsed"
        };
      }

      this.remoteCall(d); // console.log(d);

      this.$timeout(function () {
        _this2.updateContent();
      }, 500);
    } // Function called to initialized the option views. 
    // 
    // 

  }, {
    key: "onInitEditMode",
    value: function onInitEditMode() {
      this.addEditorTab('Options', 'public/plugins/mytest-panel/options.html', 2);
    }
  }]);

  return ElastiGrafCtrl;
}(_sdk.PanelCtrl);

exports.ElastiGrafCtrl = ElastiGrafCtrl;
ElastiGrafCtrl.templateUrl = 'module.html';
