var UserProfile = (function(){
  var database = firebase.database();
  var usersRef = firebaseDatabase.ref("users");

  var userProfile = function(profile) {
    this.profile = profile;
    this.name = profile.name;
  };

  userProfile.get = function(uid, callback) {
    usersRef.child(uid).once("value", function(snapshot) {
      // User entry already exists
      if (snapshot.exists()) {
        var profile = new userProfile(snapshot.val());
        callback(profile);
      }
    });
  };

  userProfile.checkExists = function(uid, callback) {
    usersRef.child(uid).once("value", function(snapshot) {
      callback(snapshot.exists());
    });
  };

  userProfile.create = function(uid, name, callback) {
        var p = {
          name: name
        };

        var profile = new userProfile(p);
        // Create the user entry for the user
        usersRef.child(uid).set(p);
        callback(profile);
  };

  return userProfile;
})();