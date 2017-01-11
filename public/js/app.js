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

app.controller('userController', ['$scope', '$rootScope', 'Authentication', '$cookies', function($scope, $rootScope, Authentication, $cookies) {
	// Putting functions in the global scope to be executed by view
	// Each function calls a method from the Authentication service (factory)
	$scope.login = function() {
		Authentication.login($scope.user);
	};
	// Use $rootScope here so that the block of code in index.html that is outside of ng-view can access this function
	// This controller will only control all code within the ng-view tags that it injects itself to
	$rootScope.logout = function() {
		$cookies.remove('lobby');
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

	var rootRef = firebase.database();

	$scope.lobby = {};

	var cookie = $cookies.getObject('lobby');

	firebaseAuth.$onAuthStateChanged(function(firebaseUser) { // gets auth status on controller load
		if (firebaseUser) {
			
			console.log("Signed in as:", firebaseUser.uid);
			$rootScope.currentUser = firebaseUser.uid;

			var lobbyPlayersRef = rootRef.ref('lobby_players');
			var lobbyPlayersList = $firebaseObject(lobbyPlayersRef);
			$rootScope.players = lobbyPlayersList;
			
			if (cookie) {
				$scope.activeLobby = $cookies.getObject('lobby').lobby.user;
			}

			var lobbiesRef = rootRef.ref('lobbies');
			var lobbyPlayerRef = lobbiesRef.child(firebaseUser.uid);

			/*var lobbiesList = $firebaseObject(lobbiesRef);

			lobbiesList.$loaded().then(function() {
				$scope.lobbies = lobbiesList;
			});*/

			var lobbiesList = $firebaseArray(lobbiesRef);
			$scope.lobbies = lobbiesList;
			
			$scope.addLobby = function() {
				lobbyPlayerRef.set({
					date: firebase.database.ServerValue.TIMESTAMP,
					title: $scope.lobby.title,
					lobby_owner: firebaseUser.uid
				});

				var cookieObj = {
					lobby: {
						user: firebaseUser.uid
					}
				};

				$cookies.putObject('lobby', cookieObj);
				$scope.activeLobby = firebaseUser.uid;
				$scope.lobby.title = '';
				
			};

			$scope.removeLobby = function() {
				var ref = rootRef.ref('lobbies/'+firebaseUser.uid);
				lobbiesList.$remove(lobbiesList.$getRecord(firebaseUser.uid)).then(function() {
					$scope.activeLobby = '';
					$cookies.remove('lobby');
				});
			};

			$scope.open = function(key) {
				var modalInstance = $uibModal.open({
					templateUrl: '/views/joinLobbyModal.html',
					controller: 'joinLobbyModalController',
					resolve: {
						key: function() {
							return key;
						}	
					}
				});
			};

		} else {
			firebaseAuth.$signInAnonymously();
		}
	});
}]);

app.controller('joinLobbyModalController', ['$rootScope', '$scope', '$firebaseArray', '$firebaseObject', '$uibModalInstance', 'key', '$cookies', function($rootScope, $scope, $firebaseArray, $firebaseObject, $uibModalInstance, key, $cookies) {

	var rootRef = firebase.database();

	$scope.key = key;

	$scope.close = function() {
		$uibModalInstance.close();
	};

	$scope.joinLobby = function(key) {
		console.log(key);

		var lobbyPlayersRef = rootRef.ref('lobby_players');
		var playerRef = lobbyPlayersRef.child(key).child($rootScope.currentUser);

		var lobbyPlayersList = $firebaseArray(playerRef);

		playerRef.set({
			date: firebase.database.ServerValue.TIMESTAMP,
			player_name: $scope.join_player_name,
			uid: $rootScope.currentUser
		});

		$uibModalInstance.close();
	};

}]);