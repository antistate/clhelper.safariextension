/*
Copyright (c) 2003-2011, CKSource - Frederico Knabben. All rights reserved.
For licensing, see LICENSE.html or http://ckeditor.com/license
*/

CKEDITOR.editorConfig = function( config )
{
	// Define changes to default configuration here. 
	 config.language = 'en';
	 config.coreStyles_bold = { element : 'b', overrides : 'strong' };
	 config.coreStyles_italic = { element : 'i', overrides : 'em' };
	 config.extraPlugins = 'autogrow';
	 config.autoGrow_maxHeight = '500';
	 
	 
	 config.toolbar =
		 [
		     { name: 'clipboard',   items : [ 'NewPage', 'Cut','Copy','Paste','PasteText','PasteFromWord','-','Undo','Redo' ] },
		     { name: 'editing',     items : [ 'Find','Replace','-','SelectAll','-','Scayt' ] },
		     { name: 'styles',      items : [ 'Styles','Format','Font','FontSize' ] },
		     { name: 'colors',      items : [ 'TextColor','BGColor' ] },
		     '/',
		     { name: 'basicstyles', items : [ 'Bold','Italic','Underline','Strike','Subscript','Superscript','-','RemoveFormat' ] },
		     { name: 'paragraph',   items : [ 'NumberedList','BulletedList','-','Outdent','Indent','-','Blockquote','CreateDiv','-','JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock','-','BidiLtr','BidiRtl' ] },
		     { name: 'links',       items : [ 'Link','Unlink','Anchor' ] },
		     { name: 'insert',      items : [ 'Image','Table','HorizontalRule','SpecialChar' ] },
		     { name: 'tools',       items : [ 'ShowBlocks','-','About' ] }
		 ];	 
};
