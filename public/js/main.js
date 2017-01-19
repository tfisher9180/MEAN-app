$(document).ready(function() {

	$('.nav-tabs a').click(function(e) {
		e.preventDefault();
	});

	$('.search').click(function(e) {
		e.preventDefault();
		$('.mobile-filter').slideToggle();
	});

});