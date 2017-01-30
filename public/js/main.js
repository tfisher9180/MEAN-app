$(document).ready(function() {

	$('body').on('click', '.search', function(e) {
		e.preventDefault();
		$('.mobile-filter').slideToggle();
	});

	$('.nav-tabs a').click(function(e) {
		e.preventDefault();
	});

	$('#btn-browse-games').click(function() {
		$('html, body').animate({
			scrollTop: $('#games').offset().top
		}, 500);
	});

});