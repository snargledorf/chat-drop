(function() {

  LocationMonitor = function() {
    var listeners = [];

    var locationWatchId = navigator.geolocation.watchPosition(function(loc) {
        notifyOfLocationChange(loc);
    }, function(error) {
        console.log(error);
    });

    this.locationChanged = function(listener) {
      listeners.push(listener);
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

    function notifyOfLocationChange(loc) {
      for (var i = 0; i < listeners.length; i++) {
        var listener = listeners[i];
        listener(loc);
      }
    };
  };

  Location = {
    getCurrentLocation: function(callback) {
      if (!Location.locationSupported())
        return;

      navigator.geolocation.getCurrentPosition(function(loc) {
        callback([loc.latitude, loc.longitude]);
      }, function(error) {
          console.log(error);
      });
    },
    locationSupported: function() {
      return "geolocation" in navigator;
    }
  };
})();