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
     config.fontSize_style =
    {
        element		: 'font',
        attributes		: { 'size' : '#(size)' },
        overrides	: [ { element : 'span', styles : { 'font-size' : null } } ]
    };	 
//    config.font_style =
//    {
//        element		: 'font',
//        attributes		: { 'face' : '#(family)', 'color' : '#(color)' },
//        overrides	: [ { element : 'span', styles : { 'font-family' : null, 'color' : null } } ]
//        attributes		: { 'color' : '#(color)' },
//        overrides	: [ { element : 'span', styles : { 'color' : null } } ]
//    };
    config.colorButton_enableMore = false;
    config.colorButton_colors = 'Black/000,Maroon/800000,SaddleBrown/8B4513,DarkSlateGray/2F4F4F,Teal/008080,Navy/000080,Indigo/4B0082,DarkGray/696969,FireBrick/B22222,Brown/A52A2A,GoldenRob/DAA520,DarkGreen/006400,Turquoise/40E0D0,MediumBlue/0000CD,Purple/800080,Gray/808080,Red/F00,DarkOrange/FF8C00,Gold/FFD700,Green/008000,Cyan/0FF,Blue/00F,Violet/EE82EE,DimGray/A9A9A9,LightSalmon/FFA07A,Orange/FFA500,Yellow/FFFF00,Lime/00FF00,PaleTurquoise/AFEEEE,LightBlue/ADD8E6,Plum/DDA0DD,LightGray/D3D3D3,LavenderBlush/FFF0F5,AntiqueWhite/FAEBD7,LightYellow/FFFFE0,Honeydew/F0FFF0,Azure/F0FFFF,AliceBlue/F0F8FF,Lavender/E6E6FA,White/FFF';
};
