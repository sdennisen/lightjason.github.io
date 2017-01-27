/*
 * Teletype jQuery Plugin
 * @version 0.1.6
 *
 * @author Steve Whiteley & Philipp Kraus
 * @see http://teletype.rocks
 * @see https://github.com/stvwhtly/jquery-teletype-plugin
 *
 * Copyright (c) 2015-2017 Steve Whiteley & Philipp Kraus
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 */

"use strict";;
(function() {

    var pluginname = "teletype";

    // ---- jQuery initialization -------------------------------------------------------------------------------------------

    /**
     * plugin initialize
     *
     * @param options any options
     */
    jQuery.fn[pluginname] = function(options) {
        var plugin = this.data('plugin_' + pluginname);

        if (!plugin) {
            plugin = new Teletype(this, jQuery.extend({}, jQuery.fn[pluginname].defaultSettings, options || {}));
            this.data('plugin_' + pluginname, plugin)
        }

        return plugin;

    };


    /**
     * default settings
     */
    jQuery.fn[pluginname].defaultSettings = {
        // plain text commands
        text: [],
        // results of each command as HTML data (length of text and result array must be equal, for empty results, use an empty string)
        result: [],
        // starts typing automatically otherwise with calling start-function
        automaticstart: true,
        // CSS class of command-results
        classresult: "teletype-result",
        // CSS class of teletype prefix
        classprefix: "teletype-prefix",
        // CSS class of teletype cursor
        classcursor: "teletype-cursor",
        // CSS class of output container
        classoutput: "teletype-text",
        // linebreak HTML tag
        taglinebreak: "<br/>",
        // type delay
        typeDelay: 120,
        // backward delay
        backDelay: 180,
        // cursor blink speed
        blinkSpeed: 1000,
        // cursor visualization
        cursor: '|',
        // command-line prefix
        prefix: '',
        // number foe looping typing
        loop: 1,
        // humanise typing
        humanise: true,
        // cursor smooth blinking
        smoothBlink: true,
        // callback function to catch next command (parameter full teletype DOM object)
        callbackNext: null,
        // callback function to catch typing (parameter full teletype DOM object)
        callbackType: null,
        // callback function to catch backward moving (parameter full teletype DOM object)
        vallbackBackward: null,
        // callback function which is called after finished typing (parameter full teletype DOM object)
        callbackFinished: null,
        // callback function which is calld on start typing (parameter full teletype DOM object)
        callbackStart: null,
        // callback function which is called on restting DOM element (parameter full teletype DOM object)
        callbackReset: null,
        // callback function, which is called on next loop (parameter full teletype DOM object)
        callbackNextLoop: null
    };


    // ---- plugin definition -----------------------------------------------------------------------------------------------

    /**
     * plugin factory
     *
     * @param po_element DOM element
     * @param po_options initialize options
     */
    function Teletype(po_element, po_options) {
        this.dom = po_element
        this.settings = po_options;

        return initialize(this);
    }


    Teletype.prototype = {

        /**
         * execution typing
         */
        type: function() {

            // add new prefix item if possible
            if ((this.settings.prefix) && (this.current.position === 0))
                jQuery('<span />').addClass(this.settings.classprefix).html(this.settings.prefix).appendTo(this.output);

            // get current letter & position
            var letter = this.current.letters[this.current.position],
                start = this.current.position + 1;

            // check pause
            if (letter == '^') {
                pause(this, start);
                return;
            }

            // check for pause or remove sign
            if (letter == '~') {
                var value = extractnumber(this.current.string, start);
                if (jQuery.isNumeric(value)) {
                    var self = this;
                    this.current.position += value.length + 1;
                    this.current.timeout = setTimeout(function() {
                        backspace(self, value);
                    }, delay(this, this.settings.backDelay * value));
                    return;
                }
            }

            // check for line-break
            if ((letter == '\\') && (this.current.string.substr(start, 1) === 'n')) {
                this.current.position++;
                letter = this.settings.taglinebreak;
            }


            // run typing-callback
            if (typeof(this.settings.callbackType) == 'function')
                this.settings.callbackType(this);


            // increment current position and set output
            this.current.position++;
            this.output.html(this.output.html() + letter);

            // run the next iteration
            if (this.current.position < this.current.string.length)
                this.current.timeout = setTimeout(this.type.bind(this), delay(this, this.settings.typeDelay));
            else {
                // set the result (of the typing) if it exists
                if (this.current.result)
                    this.output.html(this.output.html() + this.current.result);

                // check if there exists a new line
                if (next(this)) {
                    this.output.html(this.output.html() + this.settings.taglinebreak);
                    this.current.timeout = setTimeout(this.type.bind(this), delay(this, this.settings.typeDelay));
                }
            }

        },


        /**
         * modifies the internal cursor representation
         *
         * @param pc_cursor cursor character
         * @return self reference
         */
        cursor: function(pc_cursor) {
            this.settings.cursor = pc_cursor;
            this.dom.find("." + this.settings.classcursor + ":first").html(this.settings.cursor);

            return this;
        },


        /**
         * resets the dom element with clearning
         *
         * @return self reference
         */
        reset: function() {
            if (this.settings.loop === 0)
                return this;

            setCurrentString(clearCurrent(this.stop().empty()));

            if (typeof(this.settings.callbackReset) == 'function')
                this.settings.callbackReset(this);

            return this;
        },


        /**
         * clears the text-field of output
         *
         * @return self reference
         */
        empty: function() {
            this.dom.find("." + this.settings.classoutput + ":first").empty();
            return this;
        },


        /**
         * stops current animation
         *
         * @return self reference
         */
        stop: function() {
            if (this.current.timeout)
                clearTimeout(this.current.timeout);

            return this;
        },


        /**
         * starts typing if automatic start is disabled
         *
         * @return self reference
         */
        start: function() {
            if (this.settings.automaticstart)
                return;

            setCurrentString(this);
            if (typeof(this.settings.callbackStart) == 'function')
                this.settings.callbackStart(po_this);

            this.type();
            return this;
        }

    }


    // ---- private function ------------------------------------------------------------------------------------------------

    /**
     * sets the current string and if possible result data
     *
     * @param po_this execution context
     */
    var setCurrentString = function(po_this) {
            if ((!po_this.settings.text) || (po_this.settings.text.length == 0))
                return;

            po_this.current.string = po_this.settings.text[po_this.current.index].replace(/\n/g, "\\n");
            po_this.current.letters = po_this.current.string.split('');
            po_this.current.result = (po_this.settings.result.length == po_this.settings.text.length) && (po_this.settings.result[po_this.current.index]) ? '<p class="' + po_this.settings.classresult + '">' + po_this.settings.result[po_this.current.index] + "</p>" : "";
        },


        /**
         * clear current
         *
         * @param po_this execution context
         * @return boolean next line exists
         */
        clearCurrent = function(po_this) {
            po_this.current = {
                string: '',
                result: '',
                letters: [],
                index: 0,
                position: 0,
                loop: 0,
                timeout: null
            };

            return po_this;
        },


        /**
         * delay function
         *
         * @param po_this execution context
         * @param pn_speed any speed value
         * @return randomized speed value
         */
        delay = function(po_this, pn_speed) {
            return po_this.settings.humanise ? Math.round(parseInt(pn_speed) + Math.random() * pn_speed / 3) : parseInt(pn_speed);
        },


        /**
         * extract a number from a text
         *
         * @param pc_text input text
         * @param pn_start start position within the string
         * @return extracted number
         */
        extractnumber = function(pc_text, pn_start) {
            var end = pc_text.substr(pn_start).search(/[^0-9]/);
            return pc_text.substr(pn_start, end == -1 ? pc_text.length : end);
        },


        /**
         * pause function for typing pause
         *
         * @param po_this execution context
         * @param pc_text current input text
         * @param pn_start start position for searching pause time
         */
        pause = function(po_this, pn_start) {
            var time = extractnumber(po_this.current.string, pn_start);
            if (!jQuery.isNumeric(time))
                return;

            po_this.current.position = pn_start + time.length;
            po_this.current.timeout = setTimeout(po_this.type.bind(po_this), time);
        },


        /**
         * sets the next outpur sequence
         *
         * @param po_this execution context
         * @return boolean next line exists
         */
        next = function(po_this) {
            po_this.current.index++;

            // check end and looping
            if (po_this.current.index >= po_this.settings.text.length) {
                po_this.current.index = 0;
                po_this.current.loop++;

                if (typeof(po_this.settings.callbackNextLoop) == 'function')
                    po_this.settings.callbackNextLoop(po_this);

                if ((po_this.settings.loop !== false) && (po_this.settings.loop == po_this.current.loop)) {
                    // runs finished callback
                    if (typeof(po_this.settings.callbackFinished) == 'function')
                        po_this.settings.callbackFinished(po_this);

                    return false;
                }
            }

            setCurrentString(po_this);
            po_this.current.position = 0;

            // runs next-callback
            if (typeof(po_this.settings.callbackNext) == 'function')
                po_this.settings.callbackNext(po_this);

            return true;
        },


        /**
         * constructor
         *
         * @param po_this execution context
         * @return boolean next line exists
         */
        initialize = function(po_this) {

            // clear DOM node first
            po_this.dom.empty();

            // sets instance an nessessary DOM values into element
            clearCurrent(po_this);
            po_this.output = jQuery('<span/>').addClass(po_this.settings.classoutput).appendTo(po_this.dom);

            // set cursor
            if (po_this.settings.cursor) {
                var cursor = jQuery('<span/>').addClass(po_this.settings.classcursor).appendTo(po_this.dom).text(po_this.settings.cursor);
                var self = po_this;
                setInterval(function() {
                    if (self.settings.smoothBlink)
                        cursor.animate({
                            opacity: 0
                        }).animate({
                            opacity: 1
                        });
                    else
                        cursor.delay(500).fadeTo(0, 0).delay(500).fadeTo(0, 1);
                }, po_this.settings.blinkSpeed);
            }

            // start typing
            if (po_this.settings.automaticstart) {
                setCurrentString(po_this);
                if (typeof(po_this.settings.callbackStart) == 'function')
                    po_this.settings.callbackStart(po_this);

                po_this.type();
            }

            return po_this;
        },


        /**
         * backspace for removing characters
         * @bug incomplete
         *
         * @param po_this execution context
         * @param pn_stop number of characters to remove
         */
        backspace = function(po_this, pn_stop) {
            if ((pn_stop < 1) || (po_this.current.position - pn_stop < 1)) {
                po_this.current.timeout = setTimeout(po_this.type.bind(po_this), delay(po_this, po_this.settings.typeDelay));
                return;
            }

            po_this.current.timeout = setTimeout(function() {
                po_this.output.html(po_this.output.html().slice(0, -1));
                backspace(po_this, pn_stop - 1);

                if (typeof(po_this.settings.callbackBackward) == 'function')
                    po_this.settings.callbackBackward(po_this);

            }, delay(po_this, po_this.settings.backDelay));

        }

}(jQuery));
