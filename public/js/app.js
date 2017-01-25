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

var app = angular.module('app', ['ngRoute', 'ngCookies', 'ngAnimate', 'angularMoment', 'firebase', 'angular-toArrayFilter', 'ui.bootstrap']);

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

app.filter('numKeys', function() {
	return function(num_players) {
		if (num_players) {
			var keys = Object.keys(num_players);
			return keys.length;
		} else {
			return '0';
		}
	}
});

app.config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
	// $routeProvider is a service
	// When we include it here as a dependency, we are calling it's methods and code, similar to how we called the Authentication service from the userController
	$routeProvider.
		when('/', {
			templateUrl: '/views/home.html', // key/value syntax ... { is an object } ... key could also be considered a method
			controller: 'homeController'
		}).
		when('/:game', {
			templateUrl: '/views/lobbies_test.html',
			controller: 'test'
		}).
		otherwise({
			redirectTo: '/'
		});

		$locationProvider.html5Mode(true);
}]);

app.controller('homeController', ['$scope', '$rootScope', function($scope, $rootScope) {

	$scope.selectedGame = ''; // sets initial option to the option with no value

}]);

app.controller('test', ['$scope', '$rootScope', '$routeParams', '$uibModal', 'gameInfo', function($scope, $rootScope, $routeParams, $uibModal, gameInfo) {

	$rootScope.game = $routeParams.game;
	if ($routeParams.game == 'overwatch') {
		$rootScope.gameFull = 'Overwatch: Origins Edition';
		$rootScope.platforms = [ 'XBOX ONE', 'PS4', 'PC' ];
		$rootScope.modes = [ 'Normal', 'Competitive', 'Arcade' ];
	}

	$scope.openStartModal = function() {
		var modalInstance = $uibModal.open({
			templateUrl: '/views/startLobbyModal.html',
			controller: 'startLobbyModalController'
		});
	};

}]);

app.controller('filterController', ['$scope', function($scope) {

	

}]);

app.controller('startLobbyModalController', ['$scope', '$uibModalInstance', function($scope, $uibModalInstance) {

	

	$scope.close = function() {
		$uibModalInstance.close();
	};


}]);

// Factory to return the $firebaseAuth service. Abstracted this into it's own factory so that the $routeProvider resolve property could immediately call the $requireSignIn helper method instead of having to create a new function in the userController that had access to the 'var auth = $firebaseAuth();'
app.factory('firebaseAuth', ['$firebaseAuth', function($firebaseAuth) {
	return $firebaseAuth();
}]);

/*
	Great example of dependency injection is using a service (factory) inside of a controller. When we declare 'Authentication' here in this controller's dependencies, we're essentially injecting all of the code that is in the Authentication service above, INTO this controller. We can call all of its methods and code right here from in this controller.
*/

/*
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
*/

// Start refactoring with - https://www.sitepoint.com/creating-three-way-data-binding-firebase-angularjs/

// Look for other firebase tutorials for proper structure
// Use stackoverflow-like layout??

app.controller('lobbiesController', ['$scope', '$timeout', '$rootScope', 'firebaseAuth', '$firebaseArray', '$firebaseObject', '$cookies', '$uibModal', '$routeParams', function($scope, $timeout, $rootScope, firebaseAuth, $firebaseArray, $firebaseObject, $cookies, $uibModal, $routeParams) {

	var rootRef = firebase.database();

	$scope.lobby = {};
	$scope.game = $routeParams.game;
	$scope.limit = 10;

	$scope.loadMore = function() {
		$scope.limit = $scope.limit + 10;
	};

	var cookie = $cookies.getObject('lobby');

	firebaseAuth.$onAuthStateChanged(function(firebaseUser) { // gets auth status on controller load
		if (firebaseUser) {
			
			console.log("Signed in as:", firebaseUser.uid);
			$rootScope.currentUser = firebaseUser.uid;

			var lobbyPlayersRef = rootRef.ref('lobby_players');
			var lobbyPlayersList = $firebaseObject(lobbyPlayersRef);
			var lobbyPlayersArray = $firebaseArray(lobbyPlayersRef.child(firebaseUser.uid));
			$rootScope.players = lobbyPlayersList;
			
			if (cookie) {
				$rootScope.activeLobby = $cookies.getObject('lobby').lobby.user;
			}

			var lobbiesRef = rootRef.ref('lobbies');
			var lobbyPlayerRef = lobbiesRef.child(firebaseUser.uid);
			var myLobbyObj = $firebaseObject(lobbyPlayerRef);

			var lobbiesList = $firebaseArray(lobbiesRef);
			$scope.lobbies = lobbiesList;
			$scope.my_lobby = myLobbyObj

			lobbyPlayersArray.$loaded().then(function(data) {
				$scope.numberPlayers = lobbyPlayersArray.length;
				$scope.playerNames = lobbyPlayersArray;
			});

			lobbyPlayersArray.$watch(function(data) {
				// player joined = data.key
				$scope.numberPlayers = lobbyPlayersArray.length;
				$scope.playerNames = lobbyPlayersArray;
				if (data.event == 'child_added') {
					$rootScope.pushNotif = 'Someone has joined your lobby';
					$timeout(function() {
						$rootScope.pushNotif = '';
					}, 5000);
				}
			});

			$scope.removeLobby = function() {
				var ref = rootRef.ref('lobbies/'+firebaseUser.uid);
				lobbiesList.$remove(lobbiesList.$getRecord(firebaseUser.uid)).then(function() {
					$rootScope.activeLobby = '';
					$cookies.remove('lobby');
				});
				rootRef.ref('lobby_players').child(firebaseUser.uid).remove();
			};

			$scope.open = function(key, title) {
				var modalInstance = $uibModal.open({
					templateUrl: '/views/joinLobbyModal.html',
					controller: 'joinLobbyModalController',
					resolve: {
						key: function() {
							return key;
						},
						title: function() {
							return title;
						}
					}
				});
			};

			$scope.openAddModal = function() {
				var modalInstance = $uibModal.open({
					templateUrl: '/views/addNewModal.html',
					controller: 'addNewModalController'
				});
			};

		} else {
			firebaseAuth.$signInAnonymously();
		}
	});
}]);

app.controller('addNewModalController', ['$rootScope', '$scope', '$firebaseArray', '$firebaseObject', '$uibModalInstance', 'key', 'title', '$cookies', function($rootScope, $scope, $firebaseArray, $firebaseObject, $uibModalInstance, key, title, $cookies) {

	var rootRef = firebase.database();
	var currentUser = $rootScope.currentUser;

	$scope.key = key;
	$scope.title = title;

	$scope.close = function() {
		$uibModalInstance.close();
	};

	$scope.joinLobby = function(key) {
		console.log(key);

		var lobbyPlayersRef = rootRef.ref('lobby_players');
		var playerRef = lobbyPlayersRef.child(key).child(currentUser);

		var lobbyPlayersList = $firebaseArray(playerRef);

		playerRef.set({
			date: firebase.database.ServerValue.TIMESTAMP,
			player_name: $scope.join_player_name,
			message: $scope.join_player_message,
			uid: currentUser
		});

		$uibModalInstance.close();
	};

}]);

app.controller('addNewModalController', ['$scope', '$rootScope', '$uibModalInstance', '$cookies',  function($scope, $rootScope, $uibModalInstance, $cookies) {

	var currentUser = $rootScope.currentUser;
	var rootRef = firebase.database();
	var lobbyRef = rootRef.ref('lobbies').child(currentUser);

	$scope.lobby = {};
	$scope.lobby.description = '';
	$scope.lobby.mic = false;
	$rootScope.my_lobby = {};

	$scope.close = function() {
		$uibModalInstance.close();
	}

	$scope.addLobby = function() {
		var expireDate = new Date();
		expireDate.setHours(expireDate.getHours() + 2);
		lobbyRef.set({
			date: firebase.database.ServerValue.TIMESTAMP,
			expires: expireDate.getTime(),
			platform: $scope.lobby.platform,
			game_mode: $scope.lobby.mode,
			player_name: $scope.lobby.name,
			title: $scope.lobby.title,
			description: $scope.lobby.description,
			mic: $scope.lobby.mic,
			lobby_owner: currentUser
		});

		$rootScope.activeLobby = currentUser;

		var cookieObj = {
			lobby: {
				user: currentUser
			}
		};

		$cookies.putObject('lobby', cookieObj, { 'expires': expireDate });
		
		// reset the form
		$uibModalInstance.close();
		$scope.lobby = {};
		$scope.addForm.$setPristine();
		$scope.addForm.$setUntouched();
		
	}

}]);

app.controller('labelBtnController', ['$rootScope', '$scope', function($rootScope, $scope) {
	$rootScope.filter_platform = '';
	$rootScope.filter_mode = '';
	$rootScope.filter_mic = '';

	/* Need this function ui-bootstrap buttons to work */
	$scope.setPlatform = function(platform) {
		$rootScope.filter_platform = platform;
	};
	$scope.setMode = function(mode) {
		$rootScope.filter_mode = mode;
	}
	$scope.setMic = function(mic) {
		$rootScope.filter_mic = mic;
	}
}]);

app.controller('pushNotificationController', ['$scope', '$rootScope', function($scope, $rootScope) {

	$scope.closeNotif = function() {
		$rootScope.pushNotif = '';
	};

}]);