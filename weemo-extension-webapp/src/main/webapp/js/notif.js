/**
 ##################                           ##################
 ##################                           ##################
 ##################   WEEMO EXTENSION         ##################
 ##################                           ##################
 ##################                           ##################
 */


/**
 * WeemoExtension Class
 * @constructor
 */
function WeemoExtension() {
  this.username = "";
  this.jzNotification = "";
  this.jzGetState = "";
  this.notifEventURL = "";
  this.getStateURL = "";
  this.weemoIntervalNotif = "";
  this.notifEventInt = "";
  this.isSupport = true;

  this.weemoKey = "";
  try {
    this.weemo = new Weemo("1033a56f0e68", "", "internal", "ppr/");
  } catch (err) {
    console.log("WEEMO NOT AVAILABLE YET");
    this.weemo = undefined;
    jqchat(".btn-weemo-conf").css('display', 'none');
    jqchat(".btn-weemo").addClass('disabled');
  }
  
     /**
     * Weemo Driver On Connection Javascript Handler
     *
     * @param message
     * @param code
     */
    this.weemo.onConnectionHandler = function(message, code) {
      if(window.console)
        console.log(" =========== Connection Handler : " + message + ' ' + code);
      switch(message) {
        case 'connectedWeemoDriver':
          this.authenticate();
          break;       
        case 'loggedasotheruser':
          // force weemo to kick previous user and replace it with current one
          this.authenticate(1);
          break;
        case 'unsupportedOS':
          weemoExtension.isSupport = false;
        case 'sipOk':
          weemoExtension.isConnected = true;
          jqchat(".btn-weemo").removeClass('disabled');
          jqchat(".weemoCallOverlay").removeClass('disabled');
          var fn = jqchat(".label-user").text();
          var fullname = jqchat("#UIUserPlatformToolBarPortlet > a:first").text().trim();
          if (fullname!=="") {
            this.setDisplayName(fullname); // Configure the display name
          } else if (fn!=="") {
            this.setDisplayName(fn); // Configure the display name
          }
          break;
      }
    }

    /**
     * Weemo Driver On Driver Started Javascript Handler
     *
     * @param downloadUrl
     */
    this.weemo.onWeemoDriverNotStarted = function(downloadUrl) {
      weemoExtension.showWeemoInstaller();      
      $btnDownload = jqchat(".btn-weemo-download");
      $btnDownload.css("display", "inline-block");
      if (navigator.platform === "Linux") {
        $btnDownload.addClass("disabled");
        $btnDownload.attr("title", "Weemo is not yet compatible with Linux OS.");
      } else {
        $btnDownload.attr("href", downloadUrl);
      }
    };


    /**
     * Weemo Driver On Call Javascript Handler
     *
     * @param type
     * @param status
     */
    this.weemo.onCallHandler = function(callObj, args)
    {
      weemoExtension.callObj = callObj;
      var type = args.type;
      var status = args.status;
      console.log("WEEMO:onCallHandler  ::"+type+":"+status+":"+weemoExtension.callType+":"+weemoExtension.callOwner+":"+weemoExtension.hasChatMessage());
      var messageWeemo = "";
      var optionsWeemo = {};
      if(type==="call" && ( status==="active" || status==="terminated" ))
      {
        console.log("Call Handler : " + type + ": " + status);
        ts = Math.round(new Date().getTime() / 1000);

        if (status === "terminated") weemoExtension.setCallOwner(false);

        if (weemoExtension.callType==="internal" || status==="terminated") {
          messageWeemo = "Call "+status;
          optionsWeemo.timestamp = ts;
        } else if (weemoExtension.callType==="host") {
          messageWeemo = "Call "+status;
          optionsWeemo.timestamp = ts;
          optionsWeemo.uidToCall = weemoExtension.uidToCall;
          optionsWeemo.displaynameToCall = weemoExtension.displaynameToCall;
        }


        if (status==="active" && weemoExtension.callActive) return; //Call already active, no need to push a new message
        if (status==="terminated" && (!weemoExtension.callActive || weemoExtension.callType==="attendee")) return; //Terminate a non started call or a joined call, no message needed


        if (weemoExtension.callType==="attendee" && status==="active") {
          weemoExtension.setCallActive(true);
          optionsWeemo.type = "call-join";
          optionsWeemo.username = weemoExtension.chatMessage.user;
          optionsWeemo.fullname = weemoExtension.chatMessage.fullname;

        }
        else if (status==="active") {
          weemoExtension.setCallActive(true);
          optionsWeemo.type = "call-on";
        }
        else if (status==="terminated") {
          weemoExtension.setCallActive(false);
          optionsWeemo.type = "call-off";
        }
        
      }
    }
  this.callObj;

  this.callOwner = jzGetParam("callOwner", false);
  this.callActive = jzGetParam("callActive", false);
  this.callType = jzGetParam("callType", "");

  this.uidToCall = jzGetParam("uidToCall", "");
  this.displaynameToCall = jzGetParam("displaynameToCall", "");

  this.chatMessage = JSON.parse( jzGetParam("chatMessage", '{}') );

  this.isConnected = false;
}

WeemoExtension.prototype.initOptions = function(options) {
  this.username = options.username;
  this.jzNotification = options.urlNotification;
  this.jzGetState = options.urlGetState;
  this.weemoIntervalNotif = options.notificationInterval;
  this.notifEventURL = this.jzNotification;
  this.getStateURL = this.jzGetState;
};

WeemoExtension.prototype.log = function() {
  console.log("callOwner         :: "+this.callOwner);
  console.log("callActive        :: "+this.callActive);
  console.log("callType          :: "+this.callType);
  console.log("uidToCall         :: "+this.uidToCall);
  console.log("displayNameToCall :: "+this.displaynameToCall);
  console.log("chatMessage       :: "+this.chatMessage);
}

WeemoExtension.prototype.setCookie = function(key, value) {  
   var expires = new Date();  
   expires.setTime(expires.getTime() + 31536000000); //1 year  
   document.cookie = key + '=' + value + ';expires=' + expires.toUTCString();  
}  
  
WeemoExtension.prototype.getCookie = function(key) {  
   var keyValue = document.cookie.match('(^|;) ?' + key + '=([^;]*)(;|$)');  
   return keyValue ? keyValue[2] : null;  
}  

WeemoExtension.prototype.showWeemoInstaller = function() {

  var isDismiss = weemoExtension.getCookie("isDismiss");
  if ( (typeof(isDismiss) == "undefined" && isDismiss == null) || !isDismiss ) {
    var uiToolbarContainer = jqchat("#UIToolbarContainer");
    var height = uiToolbarContainer.outerHeight() - jqchat(".alert").css("marginTop").replace('px', '');

    $("#weemo-alert").css({ top: height+'px' });
    jqchat("#weemo-alert").show();        
    jqchat("#weemo-alert-dismiss").click(function() {
      weemoExtension.setCookie("isDismiss", "true");
      jqchat("#weemo-alert").hide();
    });
  }

}

WeemoExtension.prototype.setKey = function(weemoKey) {
  this.weemoKey = weemoKey;
  jzStoreParam("weemoKey", weemoKey, 14400); // timeout = 60 sec * 60 min * 4 hours = 14400 sec
};

WeemoExtension.prototype.setCallOwner = function(callOwner) {
  this.callOwner = callOwner;
  jzStoreParam("callOwner", callOwner, 14400);
};

WeemoExtension.prototype.setCallType = function(callType) {
  this.callType = callType;
  jzStoreParam("callType", callType, 14400);
};

WeemoExtension.prototype.setCallActive = function(callActive) {
  this.callActive = callActive;
  jzStoreParam("callActive", callActive, 14400);
};

WeemoExtension.prototype.setUidToCall = function(uidToCall) {
  this.uidToCall = uidToCall;
  jzStoreParam("uidToCall", uidToCall, 14400);
};

WeemoExtension.prototype.setDisplaynameToCall = function(displaynameToCall) {
  this.displaynameToCall = displaynameToCall;
  jzStoreParam("displaynameToCall", displaynameToCall, 14400);
};
/**
 * A JSON Object like :
 * { "url" : url,
 *   "user" : user,
 *   "targetUser" : targetUser,
 *   "room" : room,
 *   "token" : token
 * }
 * @param chatMessage
 */
WeemoExtension.prototype.setChatMessage = function(chatMessage) {
  this.chatMessage = chatMessage;
  jzStoreParam("chatMessage", JSON.stringify(chatMessage), 14400);
};

WeemoExtension.prototype.hasChatMessage = function() {
  return (this.chatMessage.url !== undefined);
};

WeemoExtension.prototype.initChatMessage = function() {
  this.setChatMessage({});
};

WeemoExtension.prototype.hangup = function() {
  if (this.callObj !== undefined) {
    this.callObj.hangup();
  }
};

/**
 * Init Weemo Call
 * @param $uid
 * @param $name
 */
WeemoExtension.prototype.initCall = function($uid, $name) {
  if (this.weemoKey!=="" && this.weemo !== undefined) {
    jqchat(".btn-weemo-conf").css('display', 'none');

    this.weemo.setDebugLevel(1); // Activate debug in JavaScript console
    this.weemo.setWebAppId(this.weemoKey);
    this.weemo.setToken("weemo"+$uid); 
    this.weemo.initialize(); 

  } else {
    jqchat(".btn-weemo").css('display', 'none');
  }
};

/**
 *
 */
WeemoExtension.prototype.createWeemoCall = function(targetUser, targetFullname, chatMessage) {
  if (this.weemoKey!=="") {

    if (chatMessage !== undefined) {
      this.setChatMessage(chatMessage);
    }

    if (targetUser.indexOf("space-")===-1 && targetUser.indexOf("team-")===-1) {
      this.setUidToCall("weemo"+targetUser);
      this.setDisplaynameToCall(targetFullname);
      this.setCallType("internal");
    } else {
      this.setUidToCall(this.weemo.getToken());
      this.setDisplaynameToCall(this.weemo.getDisplayName());
      this.setCallType("host");
    }
    this.setCallOwner(true);
    this.setCallActive(false);
    this.weemo.createCall(this.uidToCall, this.callType, this.displaynameToCall);

  }

};

/**
 *
 */
WeemoExtension.prototype.joinWeemoCall = function(chatMessage) {
  if (this.weemoKey!=="") {
    if (chatMessage !== undefined) {
      this.setChatMessage(chatMessage);
    }
    this.setCallType("attendee");
    this.setCallOwner(false);
    this.setCallActive(false);
    this.weemo.createCall(this.uidToCall, this.callType, this.displaynameToCall);

  }

};

/**
 * Update state
 */
WeemoExtension.prototype.refreshNotif = function() {
  jqchat.ajax({
    url: this.notifEventURL,
    dataType: "json",
    context: this,
    success: function(data){

    },
    error: function(){
     
    }
  });

};


/**
 * Gets target user status
 * @param targetUser
 */
WeemoExtension.prototype.getStatus = function(targetUser, callback) {

  var refreshURL = this.getStateURL + targetUser + "/";
  jqchat.ajax({
    url: refreshURL, 
    dataType: "text",   
    context: this,
    success: function(data){
      if (typeof callback === "function") {
        callback(targetUser, data);
      }
    },
    error: function(){
      if (typeof callback === "function") {
        callback(targetUser, "offline");
      }
    }
  });
};



WeemoExtension.prototype.attachWeemoToPopups = function() {
  var checkTiptip = jqchat('#tiptip_content').html();
  if (checkTiptip === undefined) {
    setTimeout(jqchat.proxy(this.attachWeemoToPopups, this), 250);
    return;
  }
  jqchat('#tiptip_content').bind('DOMNodeInserted', function() {
    var username = "";
    var fullname = "";
    var addStyle = "";
    var $uiElement;

    var $uiAction = jqchat(".uiAction", this).first();
    if ($uiAction !== undefined && $uiAction.html() !== undefined) {
      //console.log("uiAction bind on weemoCallOverlay");
      var $uiFullname = jqchat('#tiptip_content').children('#tipName').children("tbody").children("tr").children("td").children("a");
      $uiFullname.each(function() {
        var html = $(this).html();
        if (html.indexOf("/rest/")==-1) {
          fullname = html;
        }
        var href = $(this).attr("href");
        if (href.indexOf("/portal/intranet/activities/")>-1) {
          username = href.substr(28);
        }
      });
      $uiElement = $uiAction;
    }
    if (username !== "" && $uiElement.has(".weemoCallOverlay").size()===0 && weemoExtension.isSupport) {
      var out = '<a type="button" class="btn weemoCallOverlay weemoCall-'+username.replace('.', '-')+' disabled" title="Make a Video Call"';
      out += ' data-fullname="'+fullname+'"';
      out += ' data-username="'+username+'" style="margin-left:5px;'+addStyle+'">';
      out += '<i class="icon-facetime-video"></i> Call</a>';

      $uiElement.append(out);
      jqchat(".weemoCallOverlay").on("click", function() {
        if (!jqchat(this).hasClass("disabled")) {
          //console.log("weemo button clicked");
          var targetUser = jqchat(this).attr("data-username");
          var targetFullname = jqchat(this).attr("data-fullname");
          weemoExtension.createWeemoCall(targetUser, targetFullname);
        }
      });

      function cbGetStatus(targetUser, status) {
        if (status !== "offline" && weemoExtension.isConnected) {
          jqchat(".weemoCall-"+targetUser.replace('.', '-')).removeClass("disabled");
        }
      }
      
      weemoExtension.getStatus(username, cbGetStatus);

    }

  });

};

WeemoExtension.prototype.attachWeemoToConnections = function() {
  if (window.location.href.indexOf("/portal/intranet/connexions")==-1) return;

  var $uiPeople = jqchat('.uiTabInPage').first();
  if ($uiPeople.html() === undefined) {
    setTimeout(jqchat.proxy(this.attachWeemoToConnections, this), 250);
    return;
  }

  function cbGetConnectionStatus(targetUser, status) {
    //console.log("Status :: target="+targetUser+" : status="+status);
    if (status !== "offline" && weemoExtension.isConnected) {
      jqchat(".weemoCall-"+targetUser.replace('.', '-')).removeClass("disabled");
    }
  }

  jqchat(".contentBox", ".uiTabInPage").each(function() {
    var $uiUsername = jqchat(this).children(".spaceTitle").children("a").first();
    var username = $uiUsername.attr("href");
    username = username.substring(username.lastIndexOf("/")+1);
    var fullname = $uiUsername.html();

    var $uiActionWeemo = jqchat(".weemoCallOverlay", this).first();
    if ($uiActionWeemo !== undefined && $uiActionWeemo.html() == undefined && weemoExtension.isSupport) {
      var html = jqchat(this).html();
      html += '<a type="button" class="btn weemoCallOverlay weemoCall-'+username.replace('.', '-')+' pull-right disabled" id="weemoCall-'+username.replace('.', '-')+'" title="Make a Video Call"';
      html += ' data-username="'+username+'" data-fullname="'+fullname+'"';
      html += ' style="margin-left:5px;"><i class="icon-facetime-video"></i> Call</a>';
      jqchat(this).html(html);

      weemoExtension.getStatus(username, cbGetConnectionStatus);
    }

  });


  jqchat(".weemoCallOverlay").on("click", function() {
    if (!jqchat(this).hasClass("disabled")) {
      //console.log("weemo button clicked");
      var targetUser = jqchat(this).attr("data-username");
      var targetFullname = jqchat(this).attr("data-fullname");
      weemoExtension.createWeemoCall(targetUser, targetFullname);
    }
  });


};

/**
 ##################                           ##################
 ##################                           ##################
 ##################   HACK                    ##################
 ##################                           ##################
 ##################                           ##################
 */



/**
 * Hack to ignore console on for Internet Explorer (without testing its existence
 * @type {*|{log: Function, warn: Function, error: Function}}
 */
var console = console || {
  log:function(){},
  warn:function(){},
  error:function(){}
};



/**
 ##################                           ##################
 ##################                           ##################
 ##################   GLOBAL                  ##################
 ##################                           ##################
 ##################                           ##################
 */

// GLOBAL VARIABLES

var weemoExtension = new WeemoExtension();


(function($) {

  $(document).ready(function() {
    weemoExtension.showWeemoInstaller();
    //GETTING DOM CONTEXT
    var $notificationApplication = $("#weemo-status");
    
    // WEEMO NOTIFICATION INIT
    weemoExtension.initOptions({
      "username": $notificationApplication.attr("data-username"),
      "urlNotification": "/rest/state/ping/",
      "urlGetState": "/rest/state/status/",
      "notificationInterval": $notificationApplication.attr("data-weemo-interval-notif")      
    });

    // WEEMO : GETTING AND SETTING KEY
    var weemoKey = $notificationApplication.attr("data-weemo-key");
    weemoExtension.setKey(weemoKey);

    
    
    var username = $notificationApplication.attr("data-username");
    weemoExtension.initCall(username, username);
    weemoExtension.attachWeemoToPopups();
    weemoExtension.attachWeemoToConnections();



    weemoExtension.notifEventInt = window.clearInterval(weemoExtension.notifEventInt);
    weemoExtension.notifEventInt = setInterval(jqchat.proxy(weemoExtension.refreshNotif, weemoExtension), weemoExtension.weemoIntervalNotif);
    weemoExtension.refreshNotif();


  });

})(jqchat);


