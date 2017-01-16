$(document).ready(function() {

	$('.notifications').on('click', function() {
		$(this).find('ul').fadeToggle();
		if ($(this).find('li').length == 0) {
			$(this).find('ul').append('<li class="list-group-item">No players have joined your lobby yet</li>');
		}
	});

	$('#btn-create').on('click', function() {
		$('form[name="add-form"]').slideToggle();
	});

});
