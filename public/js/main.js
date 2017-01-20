$(document).ready(function() {

	$('body').on('click', '.search', function(e) {
		e.preventDefault();
		$('.mobile-filter').slideToggle();
	});

	$('.nav-tabs a').click(function(e) {
		e.preventDefault();
	});

});