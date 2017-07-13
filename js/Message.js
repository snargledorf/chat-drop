(function() {
    
    var database = firebase.database();
    var chatMessagesRef = database.ref("chat-messages");
    var messageLocationsRef = database.ref("message-locations");
    var messageLocationsGeoFire = new GeoFire(messageLocationsRef);
    
    var MessageImpl = function(messageId, text, uid) {
        this.messageId = messageId;
        this.text = text;
        this.uid = uid;
    };

    MessageImpl.prototype.setLocation = function(loc, callback) {
        messageLocationsRef.set(this.messageId, loc.cords).then(function() {
            if (callback) {
                callback();
            }
        });
    };

    var NearbyMessage = function(id, locationQuery) {
        this.id = id;

        var nbm = this;

        this.leftMessageArea = function(listener) {
            locationQuery.on("key_exited", function(key) {
                if (key !== id) {
                    return;
                }

                listener(nbm);
            });
        };
    };

    NearbyMessageMonitor = function(radius) {
        this.radius = radius;
        
        var locationMonitor = new LocationMonitor();

        var locationChangedListener = null;
        var messageNearbyListeners = [];

        // Start by querying the current location to get a starting
        // point.
        Location.getCurrentLocation(function(loc) {
            var criteria = {
                center: [loc.latitude, loc.longitude],
                radius: radius
            };

            // Create a location query based on our current location
            var locationQuery = messageLocationsGeoFire.query(criteria);

            // Listen for when we enter an area with a message
            locationQuery.on("key_entered", function(key, location, distance) {
                // Notify the listener of a nearby message
                var nearbyMessage = new NearbyMessage(key, locationQuery);
                notifyNearbyMessageListeners(nearbyMessage);
            });

            // Begin monitoring for location changes and updating
            // our query location as we move
            locationChangedListener = function(loc) {
                var criteria = {
                    center: [loc.latitude, loc.longitude],
                    radius: radius
                };

                locationQuery.updateCriteria(criteria);
            };

            locationMonitor.locationChanged(locationChangedListener);
        });

        this.messageNearby = function(listener) {
            messageNearbyListeners.push(listener);
        };

        this.removeListener = function(listener) {
            var index = messageNearbyListeners.indexOf(listener);
            if (index > -1) {
                messageNearbyListeners.splice(index, 1);
            }
        }

        this.stopMonitoring = function() {
            messageNearbyListeners.length=0;
            
            if (!locationChangedListener) {
                return;
            }

            locationMonitor.removeListener(locationChangedListener);
            locationMonitor.close();
        };

        function notifyNearbyMessageListeners(nearbyMessage) {
            for (var i = 0; i < messageNearbyListeners.length; i++) {
                messageNearbyListeners[i](nearbyMessage);
            }
        }
    };
    
    Message = {
        create: function(text, uid, location, callback) {
            var messageObj = {uid:uid, text:text};
            chatMessagesRef.push(messageObj).then(function(snapshot) {
                var id = snapshot.key();
                var message = new MessageImpl(snapshot.key(), text, uid);
                message.setLocation(location, function() {                    
                    if (callback) {
                        callback(message);
                    }
                });
            })
            .catch(function(error) {
                console.log(error);
            });
        },
        delete: function(id, callback) {
            messageLocationsGeoFire.remove(id).then(function(){
                chatMessagesRef.child(id).remove().then(function() {
                    if (callback) {
                        callback();
                    }
                });
            });
        },
        get: function(id, callback) {
            chatMessagesRef.child(id).once("value", function(snapshot) {
                if (!snapshot.exists()) {
                    return;
                }
                
                var msgObj = snapshot.val();

                var message = new MessageImpl(id, msgObj.text, msgObj.uid);
                
                if (callback) {
                    callback(message);
                }
            });
        }
    };
})();