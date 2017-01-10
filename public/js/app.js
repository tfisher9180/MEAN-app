/*
	Being able to inject code into different modules is the whole point of angular

	When we created the Authentication factory, it's a service or dependency that we can call in other modules.
	So we can inject that service into the userController, and access its methods and code just by calling "Authentication.method"
	Similarly when we inject $firebaseObject or $scope into a module, we can access the code that we included in the script tags on index.html

	That's dependency injection 
	... being able to call different pieces of code, or modules, together to form a complete application
*/
/*
	Remember, a callback is only executed once its function finishes executing
*/

var app = angular.module('app', ['ngRoute', 'ngCookies', 'firebase', 'angular-toArrayFilter', 'ui.bootstrap']);

// This is executed if a resolve property from the $routeProvider below fails or returns false
app.run(['$rootScope', '$location', function($rootScope, $location) {
	$rootScope.$on('$routeChangeError', function(event, current, previous, error) {
		// catch error thrown if $requireSignIn promise is rejected
		if (error === "AUTH_REQUIRED") {
			$rootScope.message = 'You must login to access that page';
			$location.path('/login');
		}
	});
}]);

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
	// $routeProvider is a service
	// When we include it here as a dependency, we are calling it's methods and code, similar to how we called the Authentication service from the userController
	$routeProvider.
		when('/', {
			templateUrl: '/views/list.html', // key/value syntax ... { is an object } ... key could also be considered a method
			controller: 'listController'
		}).
		when('/login', {
			templateUrl: '/views/login.html',
			controller: 'userController'
		}).
		when('/register', {
			templateUrl: '/views/register.html',
			controller: 'userController'
		}).
		when('/lobbies', {
			templateUrl: '/views/lobbies.html',
			controller: 'lobbiesController'/*,
			resolve: {
				// controller will not be loaded until $requireSignIn resolves
				"currentAuth": ['firebaseAuth', function(firebaseAuth) {
					// if user is not signed in, throws error and resolve fails. This triggers a $routeChangeError handled in app.run() above.
					return firebaseAuth.$requireSignIn();
					// fixed a problem here. Originally was calling 'return Authentication.$requireSignIn();' however the $requireSignIn method is not attached to the factory, it's attached to the 'var auth' INSIDE of the factory. In order to get this to work had to create a new method inside of the factory called currentAuth(), which has access to the 'var auth'. Seeing this, we can abstract the creation of the auth var into its own factory and require it on the Authentication factory AND here.
				}]
			}*/	// angularJS feature, a list of dependencies that the $routeProvider service will wait for (until they're resolved). If the promises are resolved successfully, then everything will continue as normal, but if any are rejected then it creates an event called route change error and the controller will NOT be instantiated.
		}).
		otherwise({
			redirectTo: '/login'
		});

		$locationProvider.html5Mode(true);
}]);

// Factory to return the $firebaseAuth service. Abstracted this into it's own factory so that the $routeProvider resolve property could immediately call the $requireSignIn helper method instead of having to create a new function in the userController that had access to the 'var auth = $firebaseAuth();'
app.factory('firebaseAuth', ['$firebaseAuth', function($firebaseAuth) {
	return $firebaseAuth();
}]);

/*
	Great example of dependency injection is using a service (factory) inside of a controller. When we declare 'Authentication' here in this controller's dependencies, we're essentially injecting all of the code that is in the Authentication service above, INTO this controller. We can call all of its methods and code right here from in this controller.
*/


app.factory('Authentication', ['firebaseAuth', '$rootScope', '$firebaseObject', '$location', function(firebaseAuth, $rootScope, $firebaseObject, $location) {
	var dbRef = firebase.database();

	// $firebaseObject(firebase.database().ref('users').child(firebaseUser.uid))
	// create reference to the user in the database using onAuthStateChanged callback
	// create a new firebaseObject bound to that reference

	firebaseAuth.$onAuthStateChanged(function(firebaseUser) {
		if (firebaseUser) {
			// user is logged in
			var userRef = dbRef.ref('users').child(firebaseUser.uid);
			var userObj = $firebaseObject(userRef);
			$rootScope.currentUser = userObj;
		} else {
			// user is not logged in
			$rootScope.currentUser = '';
		}
	});

	return {
		login: function(user) {
			firebaseAuth.$signInWithEmailAndPassword(user.email, user.password)
				.then(function(regUser) {
					$location.path('/lobbies'); // replace '/login' with '/lobbies' (calls $routerProvider)
				})
				.catch(function(error) {
					$rootScope.message = error.message;
				});
		},
		logout: function() {
			// triggers $onAuthStateChanged
			return firebaseAuth.$signOut();
		},
		register: function(user) {
			firebaseAuth.$createUserWithEmailAndPassword(user.email, user.password)
				.then(function(regUser) {
					var usersRef = firebase.database().ref('users')
						.child(regUser.uid).set({ // .child() is similar to the index of an element in an array, it identifies the record
							date: firebase.database.ServerValue.TIMESTAMP,
							regUser: regUser.uid,
							fname: user.fname,
							lname: user.lname,
							email: user.email
						});
					$location.path('/lobbies');
				})
				.catch(function(error) {
					$rootScope.message = error.message;
				});
		}
	};
}]);

app.controller('userController', ['$scope', '$rootScope', 'Authentication', function($scope, $rootScope, Authentication) {
	// Putting functions in the global scope to be executed by view
	// Each function calls a method from the Authentication service (factory)
	$scope.login = function() {
		Authentication.login($scope.user);
	};
	// Use $rootScope here so that the block of code in index.html that is outside of ng-view can access this function
	// This controller will only control all code within the ng-view tags that it injects itself to
	$rootScope.logout = function() {
		Authentication.logout();
	};
	$scope.register = function() {
		Authentication.register($scope.user);
	};
}]);

app.controller('listController', ['$scope', '$http', function($scope, $http) {
	$scope.formData = {};

	$http.get('/api/lobbies')
		.then(function(res) {
			$scope.lobbies = res.data;
			$scope.formData.platform = 'PS4';
			$scope.formData.mode = 'multiplayer';
		}, function(res) {
			console.log('Error: ' + res);
		});

	$scope.createLobby = function() {
		$http.post('/api/lobbies', $scope.formData)
			.then(function(res) {
				$scope.formData = {};
				$scope.lobbies = res.data;
			}, function(res) {
				console.log('Error ' + res);
			});
	};

	$scope.deleteLobby = function(id) {
		$http.delete('/api/lobbies/' + id)
			.then(function(res) {
				$scope.lobbies = res.data;
			}, function(res) {
				console.log('Error ' + res);
			});
	};
}]);

app.controller('lobbiesController', ['$scope', '$rootScope', 'firebaseAuth', '$firebaseArray', '$firebaseObject', '$cookies', '$uibModal', function($scope, $rootScope, firebaseAuth, $firebaseArray, $firebaseObject, $cookies, $uibModal) {

	var dbRef = firebase.database();

	$scope.lobby = {};

	firebaseAuth.$onAuthStateChanged(function(firebaseUser) { // gets auth status on controller load
		if (firebaseUser) {
			// User is anonymously signed in
			console.log("Signed in as:", firebaseUser.uid);

			// Set currentUser in root scope to the hash
			$rootScope.currentUser = firebaseUser.uid;

			// Check if there's an active lobby (cookie)
			var lobbyCookie = $cookies.getObject('lobby');

			// If there's an active lobby set location in database (index) and activeLobby var to the lobby hash
			if (lobbyCookie) {
				$scope.activeLobby = $cookies.getObject('lobby').lobby.lobbyID;
				$scope.index = $cookies.getObject('lobby').lobby.index;
			}
			
			// Set reference to the lobbies node
			var lobbiesRef = dbRef.ref('lobbies');

			// Get the lobby data as an array
			var lobbyInfo = $firebaseArray(lobbiesRef);

			// Get the lobby data as an object for hash
			var lobbyInfoObj = $firebaseObject(lobbiesRef);

			// Once lobbies retrieved from DB display them in scope
			/*lobbyInfo.$loaded().then(function(data) {
				$scope.lobbies = lobbyInfo;
			});*/

			lobbyInfoObj.$loaded().then(function(data) {
				$scope.lobbies = lobbyInfoObj;
			});

			$scope.addLobby = function() {
				lobbyInfo.$add({
					date: firebase.database.ServerValue.TIMESTAMP, // todays date
					user: firebaseUser.uid, // the current user
					title: $scope.lobby.title // the lobby title (user input)
				}).then(function(lobbyRef) {
					// returns hash that was created

					// store index of created lobby in database for use in several places
					var lobbyIndex = lobbyInfo.$indexFor(lobbyRef.key);

					// store hash of created lobby in database for use in several places
					var lobbyHash = lobbyRef.key;

					var obj = {
						lobby: {
							user: firebaseUser.uid, // the current user
							lobbyID: lobbyHash, // the hash that was created
							index: lobbyIndex // the location of it in the database
						}
					}

					// Set an active lobby cookie with the above info in it
					$cookies.putObject('lobby', obj);

					// Send some of this data to the view
					$scope.activeLobby = lobbyHash; // the hash that was created
					$scope.index = lobbyIndex;

					// Clear the form
					$scope.lobby.title = '';
				});
			};

			$scope.removeLobby = function(index) {
				lobbyInfo.$remove(lobbyInfo[index]);
				$scope.activeLobby = '';
				$scope.index = '';
				$cookies.remove('lobby');
			};

			$scope.open = function(hash, lobby) {
				var modalInstance = $uibModal.open({
					templateUrl: '/views/joinLobbyModal.html',
					controller: 'joinLobbyModalController',
					resolve: {
						hash: function() {
							return hash;
						},
						lobby: function() {
							return lobby;
						}
					}
				});
			};

		} else {
			firebaseAuth.$signInAnonymously();
		}
	});
}]);

app.controller('joinLobbyModalController', ['$rootScope', '$scope', '$firebaseArray', '$firebaseObject', '$uibModalInstance', 'hash', 'lobby', '$cookies', function($rootScope, $scope, $firebaseArray, $firebaseObject, $uibModalInstance, hash, lobby, $cookies) {

	var dbRef = firebase.database();

	$scope.hash = hash;
	$scope.lobby = lobby;

	$scope.close = function() {
		$uibModalInstance.close();
	};

	$scope.joinLobby = function(hash) {
		console.log(hash);
		// Reference to the location of the players node in the selected lobby
		var playersRef = dbRef.ref('lobbies/'+hash+'/players');
		var lobbyRef = dbRef.ref('lobbies/'+hash);

		var lobbyInfo = $firebaseObject(lobbyRef);
		var lobbyOwner = lobbyInfo.user;

		// Create array out of reference to add data
		var playersInfo = $firebaseArray(playersRef);

		// Add data to lobby/players node
		playersInfo.$add({
			date: firebase.database.ServerValue.TIMESTAMP, // the current date
			player_name: $scope.join_player_name, // the player name from the input field
			user: $scope.currentUser // the hash for the anonymous user
		}).then(function(ref) {
			var key = ref.key;
			var index = playersInfo.$indexFor(key);
			console.log(key, index);

			$uibModalInstance.close();
		});
	};

}]);