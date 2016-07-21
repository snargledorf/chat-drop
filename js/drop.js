const SEARCH_RADIUS = 0.01524; // 50 feet

var firebaseAuth = firebase.auth();
var firebaseDatabase = firebase.database();

// Setup commonly used refs
var usersRef = firebaseDatabase.ref("users");
var chatMessagesRef = firebaseDatabase.ref("chat-messages");
var messageLocationsRef = firebaseDatabase.ref("message-locations");

// Create a geofire object for the message locations
var messageLocationsGeoFire = new GeoFire(messageLocationsRef);
var currentLocationQuery = null;

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
        createUserProfileIfNotExist();
    }

    toggleLoginAndUserList();
});

function toggleLoginAndUserList() {    
    if (signedInUser) {
        hideLogin();
        
        // First get the current location so that we can
        // start querying the surrounding area
        getCurrentLocation(function() {
            // Start monitoring our current location and updating
            // the search query whenever our location changes
            startMonitoringLocation();
            bindChatbox();
        });
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

function createUserProfileIfNotExist() {
    if (!signedInUser)
        return;

    usersRef.child(signedInUser.uid).once("value", function(snapshot) {
        // User entry already exists
        if (snapshot.exists())
            return;

        // Create the user entry for the user
        usersRef.child(signedInUser.uid).set({
            name: signedInUser.displayName
        });
    });
}

function send() {
    var message = messageTextBox.val();
    if (!message || message.length==0)
        return;

    // Post the message
    chatMessagesRef.push({uid:signedInUser.uid, text:message}).then(function(snapshot) {
        // Set the messages location (notifies clients)
        messageLocationsGeoFire.set(snapshot.key, currentLocation);

        messageTextBox.val("");
        messageTextBox.focus();
    })
    .catch(function(error) {
        console.log(error);
    });
}

function bindChatbox() {
    messages.empty();

    messages.on("click", ".message-delete", function() {
        var messageKey = this.closest(".message").id;
        deleteMessage(messageKey);
    });

    // Wait for new messages to enter the area
    messageEnteredAreaEvent = currentLocationQuery.on("key_entered", function(key, location, distance) {

        var distanceValueElement = $("<span/>", {id:"distanceValue"}).text(distance.toFixed(2) + "km ");
        var distanceElement =  $("<span/>", {id:"distance"}).text(" - Distance: ").append(distanceValueElement);
                
        // Get the message for the key
        chatMessagesRef.child(key).once("value", function(snapshot) {
            var message = snapshot.val();
            if (!message)
                return;
            
            message.key = snapshot.key;
            message.showDelete = message.uid == signedInUser.uid;

            // Get the posting users name
            usersRef.child(message.uid).child("name").once("value", function(snapshot) {         
                var name = snapshot.val();

                message.name = name;

                var messageHtml = MyApp.templates.message(message);

                // Append the new message to the chatbox
                messages.append(messageHtml);
            });
        });
    });

    messageExitedAreaEvent = currentLocationQuery.on("key_exited", function(key) {
        messages.children("#"+key).remove();
    });
}

function unbindChatbox() {
    if (messageEnteredAreaEvent)
        messageEnteredAreaEvent.cancel();
    if (messageExitedAreaEvent)
        messageExitedAreaEvent.cancel();

    messages.empty();
}

function deleteMessage(key) {
    messageLocationsGeoFire.remove(key).then(function(){
        chatMessagesRef.child(key).remove();
    });
}

function startMonitoringLocation() {        
    if (!browserSupportsLocation())
        return;

    locationWatchId = navigator.geolocation.watchPosition(function(location) {
        updateCurrentLocation(location);
    }, function(error) {
        console.log(error);
    });
}

function stopMonitoringLocation() {
    if (!browserSupportsLocation() || !locationWatchId)
        return;

    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
}

function getCurrentLocation(callback) {
    if (currentLocation)
        callback(currentLocation);
        
    if (!browserSupportsLocation())
        return;

    navigator.geolocation.getCurrentPosition(function(location) {
        updateCurrentLocation(location);
        callback(currentLocation);
    }, function(error) {
        console.log(error);
    });
}

function updateCurrentLocation(loc) {
    currentLocation = [loc.coords.latitude,loc.coords.longitude];
    updateCurrentLocationQuery();
}

function updateCurrentLocationQuery() {
    var criteria = {
        center: currentLocation,
        radius: SEARCH_RADIUS
    };

    if (currentLocationQuery) {
        currentLocationQuery.updateCriteria(criteria);
    } else {
        currentLocationQuery = messageLocationsGeoFire.query(criteria)
    }
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

function browserSupportsLocation() {
    return "geolocation" in navigator;
}