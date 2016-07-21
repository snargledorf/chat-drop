const SEARCH_RADIUS = .5;

var firebaseAuth = firebase.auth();
var firebaseDatabase = firebase.database();

// Setup commonly used refs
var usersRef = firebaseDatabase.ref("users");
var chatMessagesRef = firebaseDatabase.ref("chat-messages");
var messageLocationsRef = firebaseDatabase.ref("message-locations");

// Create a geofire object for the message locations
var messageLocationsGeoFire = new GeoFire(messageLocationsRef);
var currentLocationQuery = null;

var loginButton = $("#login-button");
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
        loginButton.val("Logout").on("click", logout);
        chatbox.fadeIn();
        
        // First get the current location so that we can
        // start querying the surrounding area
        getCurrentLocation(function() {
            // Start monitoring our current location and updating
            // the search query whenever our location changes
            startMonitoringLocation();
            bindChatbox();
        });
    } else {
        loginButton.val("Sign in with Google").on("click", signInWithGoogle);
        chatbox.fadeOut();
        unbindChatbox();
        stopMonitoringLocation();
    }
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
    // Wait for new messages to enter the area
    messageEnteredAreaEvent = currentLocationQuery.on("key_entered", function(key, location, distance) {

        var distanceValueElement = $("<span/>", {id:"distanceValue"}).text(distance.toFixed(2) + "km ");
        var distanceElement =  $("<span/>", {id:"distance"}).text(" - Distance: ").append(distanceValueElement);
                
        // Get the message for the key
        chatMessagesRef.child(key).once("value", function(snapshot) {
            var message = snapshot.val();
            if (!message)
                return;
            
            var messageElement = $("<div />", {id: snapshot.key});
            var textElement =  $("<span />", {id:"text"}).text(message.text);

            // Get the posting users name
            usersRef.child(message.uid).child("name").once("value", function(snapshot) {         
                var name = snapshot.val();

                // Build the message element
                messageElement
                    .append($("<span />", {id:"name"}).text(name + ": "))
                    .append(textElement)
                    .append(distanceElement);

                    if (message.uid == signedInUser.uid){
                        messageElement.append(
                            $("<a/>", {id:"delete",href:"#"})
                                .text("Delete")
                                .on("click", function() {
                                    deleteMessage(messageKey);
                                })
                        );
                    }

                    // Append the new message to the chatbox
                    messages.append(messageElement);
            });
        });
    });

    messageExitedAreaEvent = currentLocationQuery.on("key_exited", function(key) {
        messages.children("#"+key).remove();
        keyDistanceMonitors[key].stop();
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
    chatMessagesRef.child(key).remove().then(function(snapshot){
       messageLocationsGeoFire.remove(key);
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
    firebaseAuth.signOut();
}

function browserSupportsLocation() {
    return "geolocation" in navigator;
}