const SEARCH_RADIUS = 0.01524; // 50 feet

var firebaseAuth = firebase.auth();
var firebaseDatabase = firebase.database();

var loginDialog = $("#login-dialog");
var logoutButton = $("#logout-button");
var chatbox = $("#chatbox");
var messages = $("#messages");
var messageTextBox = $("#message-textbox");

messageTextBox.keypress(function(event) {
   if (event.which==13) {
       event.preventDefault();
       send();
   } 
});

var currentLocation = null;
var locationWatchId = null;

var messageEnteredAreaEvent = null;
var messageExitedAreaEvent = null;

firebaseAuth.onAuthStateChanged(function(user) {
    signedInUser = user;
    if (signedInUser) {
        UserProfile.checkExists(user.uid, function(exists) {
            if (!exists) {
                UserProfile.create(user.uid, user.displayName, function(profile) {
                    userProfile = profile;
                });
            }
        });
    }

    toggleLoginAndUserList();
});

function toggleLoginAndUserList() {
    if (signedInUser) {
        hideLogin();        
        bindChatbox();
    } else {
        showLogin();
        unbindChatbox();
        stopMonitoringLocation();
    }
}

function showLogin() {
    loginDialog.fadeIn();
    chatbox.fadeOut();
    logoutButton.fadeOut();
}

function hideLogin() {
    loginDialog.fadeOut();
    chatbox.fadeIn();
    logoutButton.fadeIn();
}

function send() {
    var messageText = messageTextBox.val();
    if (!messageText || messageText==="")
        return;

    Message.create(messageText, signedInUser.uid, function(message) {
        clearAndFocusMessageTextBox();
    });
}

function clearAndFocusMessageTextBox() {    
    messageTextBox.val("");
    messageTextBox.focus();
}

function bindChatbox() {
    messages.empty();

    messages.on("click", ".message-delete", function() {
        var messageKey = this.closest(".message").id;
        Message.delete(messageKey);
    });

    // Used to track which messages are displayed
    var displayedMessges = [];

    // Start monitoring for nearby messages
    nearbyMessageMonitor = new NearbyMessageMonitor(SEARCH_RADIUS);
    nearbyMessageMonitor.messageNearby(function(nearbyMessage) {
        // Check if the message is displayed already
        if (displayedMessges.indexOf(nearbyMessage.id) > -1)
            return;

        nearbyMessage.leftMessageArea(function(nbm) {
            messages.children("#"+nbm.id).remove();

            // Remove the message from the displayed list
            var index = displayedMessges.indexOf(nbm.id);
            if (index > -1)
                displayedMessges.splice(nbm.id, 1);
        });

        Message.get(nearbyMessage.id, function(message) {
            UserProfile.get(message.uid, function(profile) {
                var messageModel = {
                    id: message.id,
                    text: message.text,
                    showDelete: message.uid === signedInUser.uid,
                    name: profile.name
                };

                // Create the message html
                var messageHtml = MyApp.templates.message(messageModel);
                
                // Append the new message to the chatbox
                messages.prepend(messageHtml);
                
                // Add the message to the displayed list
                displayedMessges.push(message.id);
            });
        });
    });
}

function unbindChatbox() {
    if (messageEnteredAreaEvent)
        messageEnteredAreaEvent.cancel();
    if (messageExitedAreaEvent)
        messageExitedAreaEvent.cancel();

    nearbyMessageMonitor.stopMonitoring();
    nearbyMessageMonitor = null;

    messages.empty();
}

// Public functions
function signInWithGoogle() {
    var googleProvider = new firebase.auth.GoogleAuthProvider();
    signInWithProvider(googleProvider).then(function(result) {
        console.log("Signed in!");
    }).catch(function(error) {
        console.log(error);
    });
}

// Private functions
function signInWithProvider(provider) {
    return firebaseAuth.signInWithPopup(provider);
}

function logout() {
    unbindChatbox();
    firebaseAuth.signOut();
}