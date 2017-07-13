(function() {

  LocationMonitor = function() {
    var listeners = [];
    this.currentLocation = null;

    var locationWatchId = navigator.geolocation.watchPosition(function(loc) {
        this.currentLocation = loc.coords;
        notifyOfLocationChange();
    }, function(error) {
        console.log(error);
    });

    this.locationChanged = function(listener) {
      listeners.push(listener);
      
      // Check if we have a recent cached location
      if (currentLoc) {
        listener(currentLoc);
      }
    };

    this.removeListener = function(listener) {
      var indexOfListener = listeners.indexOf(listener);
      if (indexOfListener == -1)
        return;

      listeners.splice(indexOfListener, 1);
    };

    this.close = function() {      
      listeners.length = 0;
      navigator.geolocation.clearWatch(locationWatchId);
    };

    function notifyOfLocationChange() {
      for (var i = 0; i < listeners.length; i++) {
        var listener = listeners[i];
        listener(this.currentLocation);
      }
    };
  };

  Location = {
    getCurrentLocation: function(callback) {
      if (!Location.locationSupported())
        return;

      navigator.geolocation.getCurrentPosition(function(loc) {
        callback(loc.coords);
      }, function(error) {
          console.log(error);
      });
    },
    locationSupported: function() {
      return "geolocation" in navigator;
    }
  };
})();