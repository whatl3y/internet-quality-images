/*-----------------------------------------------------------------------------------------
|TITLE:    jQuery_widgets.js
|PURPOSE:  This will contain widgets from jQuery through the $.widget constructor
|AUTHOR:  Lance Whatley
|CALLABLE TAGS:
|      
|ASSUMES:  Nothing
|REVISION HISTORY:  
|      *LJW 5/18/2015 - created
-----------------------------------------------------------------------------------------*/
/*-----------------------------------------------------------------------------------------
|NAME:      autocompleteselect (PUBLIC)
|DESCRIPTION:  Creates a combobox/autocompleteselect widget to use for <select> elements
|PARAMETERS:  None
|SIDE EFFECTS:  Nothing
|CALLED FROM:  many
|ASSUMES:    Nothing
|RETURNS:    Nothing
-----------------------------------------------------------------------------------------*/
jQuery.autocompleteselect = function() {
  $.widget( "core.autocompleteselect", {
    options: {
      placeholder: "",
      inputclasses: ""
    },
    
    _create: function() {
      this.wrapper = $( "<span>" )
        .addClass( "ui-autocompleteselect" )
        .insertAfter( this.element );

      this.element.hide();
      this._createAutocomplete();
      //this._createShowAllButton();
    },

    _createAutocomplete: function() {
      var selected = this.element.children( ":selected" );
      var value = selected.val() ? selected.text() : "";

      this.input = $( "<input>" )
        .appendTo( this.wrapper )
        .val( value )
        .attr( "title", "" )
        .attr( "placeholder", this.options.placeholder )
        .addClass( 'custom-combobox-input ui-widget ui-widget-content ui-corner-left' )
        .addClass( this.options.inputclasses )
        .autocomplete({
          delay: 0,
          minLength: 3,
          source: $.proxy( this, "_source" )
        })
        /*.tooltip({
          tooltipClass: "ui-state-highlight"
        })*/;

      this._on( this.input, {
        autocompleteselect: function( event, ui ) {
          ui.item.option.selected = true;
          this._trigger( "select", event, {
            item: ui.item.option
          });
          
          this.element.trigger( 'change' );
        },

        autocompletechange: "_removeIfInvalid"
      });
    },

    _createShowAllButton: function() {
      var input = this.input;
      var wasOpen = false;

      $( "<a>" )
        .attr( "tabIndex", -1 )
        .attr( "title", "Show All Items" )
        //.tooltip()
        .appendTo( this.wrapper )
        .button({
          icons: {
            primary: "ui-icon-triangle-1-s"
          },
          text: false
        })
        .removeClass( "ui-corner-all ui-state-default" )
        .addClass( "autocompleteselect-showall" )
        .height(function() {
          var inp=$( this ).siblings( 'input' );
          return inp.outerHeight()-parseInt(inp.css('border-left-width'));
        })
        .mousedown(function() {
          wasOpen = input.autocomplete( "widget" ).is( ":visible" );
        })
        .click(function() {
          input.focus();

          // Close if already visible
          if ( wasOpen ) {
            return;
          }

          // Pass empty string as value to search for, displaying all results
          input.autocomplete( "search", "" );
        });
    },

    _source: function( request, response ) {
      var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
      response( this.element.children( "option" ).map(function() {
        var text = $( this ).text();
        if ( this.value && ( !request.term || matcher.test(text) ) )
          return {
            label: text,
            value: text,
            option: this
          };
      }) );
    },

    _removeIfInvalid: function( event, ui ) {

      // Selected an item, nothing to do
      if ( ui.item ) {
        return;
      }

      // Search for a match (case-insensitive)
      var value = this.input.val(),
        valueLowerCase = value.toLowerCase(),
        valid = false;
      this.element.children( "option" ).each(function() {
        if ( $( this ).text().toLowerCase() === valueLowerCase ) {
          this.selected = valid = true;
          return false;
        }
      });

      // Found a match, nothing to do
      if ( valid ) {
        return;
      }

      // Remove invalid value
      this.input
        .val( "" )
        .attr( "title", value + " didn't match any item" )
        //.tooltip( "open" );
      this.element.val( "" );
      this._delay(function() {
        //this.input.tooltip( "close" ).attr( "title", "" );
      }, 2500 );
      this.input.autocomplete( "instance" ).term = "";
    },

    _destroy: function() {
      this.wrapper.remove();
      this.element.show();
    }
  });
}