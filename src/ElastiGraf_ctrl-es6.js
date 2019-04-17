
import {PanelCtrl} from 'app/plugins/sdk';
import moment from 'moment';
import './ElastiGraf-panel.css!';

export class ElastiGrafCtrl extends PanelCtrl { 
   constructor($scope, $injector) {
      super($scope, $injector );

      this.idx = 0;
      this.output = "<empty>"
      this.updateContent();
      this.templateSrv = $injector.get('templateSrv');
      this.previousQuery = "";
      this.callDeltaMs = 5000;    // variable used in Edit -> Options 
      this.lastCallTime = null;      
      // Variable holdig either the value coming from a TemplateVariable
      // or, if that is not avialable, corresponding to "this.defaultQuery". 
      this.query = "";
      this.status = "IDLE";
      // variable user in Panel 
      this.heart = "O";           
      // used in Edit -> Options 
      this.url = "http://localhost:19200/lclslogs/_search";
      // used in Edit -> Options 
      // useful if the Grafana Template Variable 'lquery' has not 
      // be defined. In such cases defaultQuery is used.
      this.defaultQuery = "nmingott AND psmetric01";       

      this.defaultElasticCall = `{"size": 20,
  "query": { 
    "bool": { 
     "must": { 
      "query_string": { 
         "default_field" : "src", 
         "query"         : "* AND ( HERE_LUCENEQ )"
                       }
             }, 
      "filter": { 
        "range": { 
          "date": { 
            "gt" : "0", 
            "lt" : maxTime 
                  } 
                 }
                }
             } 
          },
      "sort": {"date": {"order": "desc"}}  
}`;

      // Default variable string containing a function to translate JSON
      // to HTML.
      this.defaultConvertJSONtoText = `function(data) {
   var outVals = data["hits"]["hits"];
   var outHTML = "<ul id='resultsList'>";
   if (outVals.length === 0) { 
     outHTML = "<span class='errorString'><b>No Match</b></span>";
   } else {
     for(var i=0; i<outVals.length; i++) {
       var el = outVals[i];
       var elStr = el["_source"]["src"];
       outHTML = outHTML + "<li class='resultItem'>" + elStr;
     }
     outHTML = outHTML + "</ul>";		    
   }
   return(outHTML);
   }`;

      // To define our "Edit Mode" parameters
      this.events.on('init-edit-mode', this.onInitEditMode.bind(this));

   }

   // function to conver the response from Elasticsearch to 
   // human readable HTML code. The data "jData" is supposed to be 
   // encoded in a Javascript data structure.
   jsonToHtml(jData) {
      var outHTML = "";
      if (this.defaultConvertJSONtoText === "") { 
	 outHTML = "<pre>"+JSON.stringify(jData,null,3) + "</pre>"; 
	 return(outHTML);
      }      
      // Try to run the user give filer. On error print the pretty JSON format      
      try {
	 // console.log(`${this.defaultConvertJSONtoText}`);
	 // console.log(JSON.stringify(jData));
	 outHTML = eval(`( ${this.defaultConvertJSONtoText} )`)(jData);
      } catch (err) { 
	 outHTML = "<pre> Error in JSON to HTML conversion: \n";
	 outHTML += err;
	 outHTML += "\n--- default JSON output ----\n";
	 outHTML += JSON.stringify(jData,null,3) + "</pre>";
      }
      return(outHTML);
   }


   // Ajax call to Elasticsearch and set global variables either directly
   // or after a callback.
   remoteCall(d) { 
      // synonim for "this" to be used later. 
      var that = this;
      var epochMs = new Date().valueOf();

      // .Run the ajax call, if the queryStr is new stuff 
      // .It is supposed the call is made by the browser, so 
      //  it must be possible for the user computer to access 
      //  Elasticsearch.
      if (this.status === "WAIT-RESPONSE") { 
	 // console.log("DBG> --- stop call, wait response");
	 return; 
      }
      if (this.lastCallTime !== null && 
	  ((epochMs - this.lastCallTime) <= this.callDeltaMs) ) { 
	 this.status = "IDLE";
	 return; 
      }
      this.status = "WAIT-RESPONSE";
      // console.log("DBG> WAIT-RESPONSE");
      this.lastCallTime = epochMs;
      $.ajax({type:"POST",
	      dataType:"json",
	      contentType: "application/json",
              // url:"http://localhost:19200/lclslogs/_search", 
	      url: that.url,
	      cache: false,
              data: JSON.stringify(d),
              success: function(data) { 
		 // build the HTML output from Elasticsearch json response 
		 var outHTML = ""; 
		 try { 
		    outHTML = that.jsonToHtml(data);
		 } catch (err) {
		    console.log("error: " + err);
		    outHTML = ". . .";
		 }		 
		 // console.log(outHTML);
		 that.output = outHTML;
		 //
		 that.status = "IDLE";
		 // console.log("DBG> IDLE");
		 // that.$timeout( () => { that.updateContent(); }, that.waitMs );
      	      },
	      error: function(data) { 
		 // 
		 that.status = "IDLE";
		 // console.log("DBG> IDLE");
		 // that.$timeout( () => { that.updateContent(); }, that.waitMs );
	      }
             });	 

   }

   updateContent() { 
      this.value = "foo bar: " + moment().format('hh:mm:ss');

      // synonim for "this" to be used later. 
      var that = this;

      // get the value of queryStr from the interface 
      var queryStr = "";
      try {
	 var templateSrv = this.templateSrv;
	 queryStr = templateSrv.replace('$lquery');
	 // console.log("DBG> lquery: " + JSON.stringify(queryStr));
	 if (queryStr !== '$lquery') { 
	    this.query = queryStr;
	 } else { 
	    this.query = this.defaultQuery;
	 }
	 // console.log("v1: " + queryStr);
      } catch (err) {
	 // console.log("error: " + err);
      }

      // update the value of the heartbeat letter: "o" OR "O".
      this.idx = this.idx + 1;
      if ((this.idx % 2) == 0) { 
	 this.heart = "O";
      } else { 
	 this.heart = "o";
      }

      var maxTime = new Date().valueOf() + "";

      // Replace strings in the query and parse it.
      var d0, d1, d;
      try { 
	 d0 = that.defaultElasticCall;
	 d1 = d0.replace(/HERE_LUCENEQ/, this.query );
	 d1 = d1.replace(/maxTime/, maxTime);
	 d = JSON.parse(d1);
	 // console.log(d);
      } catch (err) { 
	 console.log("error" + err);
	 console.log(d1);
	 d = {"V": "to be parsed"};
      }

      this.remoteCall(d);
      // console.log(d);

      this.$timeout( () => { this.updateContent(); }, 500 );

   }

   // Function called to initialized the option views. 
   // 
   // 
   onInitEditMode() {
      this.addEditorTab('Options', 'public/plugins/mytest-panel/options.html', 2);
   }

}


ElastiGrafCtrl.templateUrl = 'module.html'

