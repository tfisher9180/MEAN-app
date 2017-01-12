$(document).ready(function() {

	$('.notifications').on('click', function() {
		$(this).find('ul').fadeToggle();
	});

	$('#btn-create').on('click', function() {
		$('form[name="add-form"]').slideToggle();
	});

});
