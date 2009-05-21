/**
 * jQuery grider
 * Versión 0.7
 * @author: Boris Barroso Camberos
 * @email: boriscyber@gmail.com
 * @license MIT
 * http://www.opensource.org/licenses/mit-license.php
 */
(function($) {

    $.fn.extend({
        grider: function(config) {
            return this.each(function(){
                new $.Grider(this, config);
            });
        }
    });

  /**
  * Transforma un grid que contiene datos asi como elementos de formulario para permitri realizar calculos
  * de una forma simple, para poder utilizar se lo hace de la siguiente forma
  * <table id="grid">
  *   <tr>
  *     <th col="precio" summary="min">Precio</th>
  *     <th col="cantidad">Cantidad</th>
  *     <th formula="precio*cantidad" summary="sum">Subtotal</th>
  *   </tr>
  *   <tr>
  *     <td>Precio</td>
  *     <td>Cantidad</td>
  *     <td></td>
  *   </tr>
  * </table>
  *
  * Y despues se ejecuta $('#grid').grider({initCalc: false});
  *
  * @attr col: Define el nombre o identificador único para cada columna de la tabla
  *
  * @attr summary: Define un campo de suma o total que adiciona una fila al final de la tabla y
  * que puede realizar las operaciones "sum" (Suma), "avg" (Promedio), "max" (Máxmimo),
  * "min" (Mínimo) y "count" (Conteo)
  *
  * @attr formula: Calculala formula que se escribe con las columnas que se haya introducido, el resultado
  * es presentado en la columna donde ha sido definido
  *
  * Configuraciones de la variable config
  * @param boolean config['initCalc'] Define si se realizara los calculos de (formula) al iniciar
  *
  * @param boolean config['addRow'] Define si es que aparecera un icono para poder adicionar filas
  * @param string config['addRowText'] Texto que aparecera dentro del caption, debe tener la siguiente
  * forma <caption><a href="#">$Contenido</a></caption>donde $contenido puede ser cualquier cadena HTML que se presentará
  * @param boolean config['delRow'] Define si es que aparecera un vinculo para borrar la fila
  * @param string config['delRowText'] Texto que aparecerá para poder borrar fila, el texto siempre debe tener la clase (delete)
  * ej: <a href="#" class="delete">borrar</a>
  * @param boolean config['countRow'] Indica si es que se va a realizar el conteo de las filas, esto permite que una correcta numeración
  * cuando se añade o se borran filas
  * @param integer config['countRow'] Define en que columna se generara los numeros de cada fila
  * @param boolean config['countRowAdd'] Indica si es que se va adicionar una columna
  */
    $.Grider = function(table, config) {
        
        /**
         * Valores por defecto
         */
        var defaults = {
            initCalc: true,
            addRow: true,
            addRowWithTab: true,
            delRow: true,
            decimals: 2,
            addRowText: '<caption><a href="#">Adicionar Fila</a></caption>',
            delRowText: '<td><a href="#" class="delete">borrar</a></td>',
            countRow: false,
            countRowRow: 0,
            countRowAdd: false,
            addedRow: false
        };
        if(config) {
            for(var k in defaults) {
                config[k] = config[k] || defaults[k];
            }
        }else{
            config = defaults;
        }

        var cols = {};
        // Identifica si la fila de summary fue creada
        var summaryRow = false;
        var formulaSet = false; // Indica si es que se a adicionado una formula
        config = config || {};
        setGrider(table);

        /**
        * Prepara todos los datos a ser usados en la tabla
        * @param DOM t Table
        */
        function setGrider(t) {
            $(table).find('tr:first').addClass('noedit');
            // Permite contar las filas
            if(config['countRow']) {
                if(config['countRowAdd']) {
                    $(table).find('tr.noedit:first').prepend('<th>Nº</th>');
                    $(table).find('tr:not(.noedit)').each(function(index, elem){
                        var ind = index+1;
                        $(elem).prepend('<td>'+ind+'</td>');
                    });
                }
            }
            
            for(var i = 0, l = t.rows[0].cells.length; i < l; i++) {
                setColumn(t.rows[0].cells[i], i);
            }
            // Tipos de columna
            setColType();
            // Necesario para poder realizar las formulas
            for(var i = 0, l = t.rows[0].cells.length; i < l; i++) {
                setFormula(t.rows[0].cells[i]);
                setSummary(t.rows[0].cells[i]);
            }
            // Calcular formulas la primera ves
            if(formulaSet && config.initCalc) {
                var rows = $(table).find('tr:not(.noedit)');
                rows.each(function(index, elem) {
                    var pos = index + 1;
                    for(var k in cols) {
                        if(cols[k].formula) {
                            calculateFormula(cols[k].name, pos);
                        }
                    }
                });
            }
            for(var k in cols){
                if(cols[k].summary)
                    calculateSummary(k);
            };
            
            // Permitir adicionado de filas
            if(config['addRow']) {
                $(table).append(config['addRowText']);
                $(table).find("caption a").click(function() {
                    addRow();
                });
            }

            // Permitir borrar filas
            if(config['delRow']) {
                $(table).find('tr:not(.noedit)').each(function(index,elem){
                    $(elem).append(config['delRowText']);
                });
                $(table).find('a.delete').live("click", function(){
                    delRow(this);
                });
            }

            // Adiciona eventos a los elementos input[type="text"] que esten relacionados a una formula
            setEvents();
            //En caso de que se adicione una nueva fila
            if(config.addRowWithTab) 
                addRowWithTab();
        }

        /**
         * Permite adicionar una nueva fila si se hace tab en la última fila en el vinculo de borrar
         */
        function addRowWithTab() {
            $(table).find("tr:not(.noedit):last a.delete").live("keydown",function(e) {
                if(e.keyCode == 9) {
                    addRow();
                }
            });
        }

        /**
        * Determina el tipo de elemento que contiene cada elemento para poder seleccionar
        */
        function setColType() {
            var row = $(table).find('tr:not(.noedit):first')[0]; // Encuentra la primera fila que no tenga clase .noedit en su tr (fila)
            
            for(var k in cols) {
                var cell = $(row).find('td:eq(' + cols[k].pos + ')')[0];
                
                var node = $(cell).find('select')[0] || $(cell).find('input:not([type="submit"])')[0] || $(cell).find('select')[0];
                try {
                     type = node.nodeName.toLowerCase();
                }catch(e){ type = false }
                
                if(type) {
                    
                    switch(type) {
                        case 'input':
                            cols[k]['type'] = 'input[type="'+ node.type +'"]';
                            break;
                        case 'select':
                            cols[k]['type'] = 'select';
                            break;
                        case 'textarea':
                            cols[k]['type'] = 'textarea';
                            break;
                        default:
                            cols[k]['type'] = 'input[type="text"]';
                            break;
                    }
                }else{
                    // sirve para poder utilizar el selector jQuery
                    cols[k]['type'] = '';
                }
            }
        }

        /**
         * Permite definir las columnas según su nombre
         * @param DOM cell Celda o TD que se esta revisando
         * @param integer pos Número de columna comenzando desde 0
         */
        function setColumn(cell, pos) {
            var col = $(cell).attr('col');
            if(col)
                cols[col] = {
                    pos: pos,
                    name: col
                };
        }

        /**
         * Permite que las columnas puedan realizar operaciones para hacer sumas, promedios, etc en la columna
         * @param DOM cell Celda
         */
        function setSummary(cell) {
            var summary = $(cell).attr('summary');
            var col = $(cell).attr('col');
            if(summary == 'sum' || summary == 'avg' || summary == 'max' || summary == 'min' || summary == 'count') {
                cols[col]['summary'] = summary;
            }

            // Adicionar la fila de summary
            if(!summaryRow) {
                var l = table.rows[0].cells.length;
                var html = '<tr class="summary noedit">';
                for(var i=0; i<l; i++) {
                    html+='<td>&nbsp;</td>';
                }
                html+='</tr>';
                jQuery(table).append(html);
                summaryRow = true;
            }
        }

        /**
        * Permite calcular los summary que son resumenes de total al final de la fila
        * @param String col
        */
        function calculateSummary(col) {
            var summary = cols[col].summary;
            var pos = parseInt(cols[col].pos) + 1;
            var cells = $(table).find('tr:not(.noedit) td:nth-child(' + pos + ')');
            var res = 0, sum = 0, max = null, min = null;

            if(summary != 'count') {
                var val = 0;

                cells.each(function(index, elem) {
                    if(cols[col].type == "") {
                        val = $(elem).html() * 1;
                    }else{
                        val = $(elem).find(cols[col].type).val() * 1;
                    }

                    switch(summary) {
                        case 'sum':
                            sum+= val;
                            break;
                        case 'avg':
                            sum+= val;
                            break;
                        case 'max':
                            if(!max){
                                max = val;
                            } else if(max < val) {
                                max = val;
                            }
                            break;
                        case 'min':
                            if(!min){
                                min = val;
                            } else if(min > val) {
                                min = val;
                            }
                            break;
                    }
                });

                switch(summary) {
                    case 'sum': res = sum; break;
                    case 'avg': res = sum/cells.length; break;
                    case 'max': res = max; break;
                    case 'min': res = min; break;
                }
            }else{
                res = cells.length;
            }
            res = res.toFixed(config.decimals);
            $(table).find('tr.summary td:eq(' + cols[col].pos +')').html(res);
        }


        /**
         * Llama a la función o funciones que sean requiridas
         * @param Event e Evento que se generó
         */
        function fireCellEvent(e) {
            var target = e.target || e.srcElement;
            if(target.nodeType == 1) {
                var rowNum = $(target).parents('tr')[0].rowIndex;
                var colNum = $(target).parents('td')[0].cellIndex;
                
                var col = findColBy(colNum, 'pos');
                for(var k in cols) {
                    if(cols[k].formula) {
                                                try{
                            var reg = '\\b'+ col.name +'\\b';
                            reg = new RegExp(reg);
                            if(reg.test(cols[k].formula)) {
                                calculateFormula(k, rowNum);
                            }
                        }catch(e){}
                    }
                }

            }/*else{
                col = jQuery(target).parents('td').eq(0)[0].cellIndex;
            }*/
        }

        /**
         * Permite crear las funciones para cada una de las celdas y define que elementos tienen evento
         * @param DOM cell Celda o TD del cual se exrae la formula
         */
        function setFormula(cell) {
      
            formulaSet = true;
            var formula = $(cell).attr('formula');
            var col = $(cell).attr('col');
            if(formula) {
                cols[col]['formula'] = formula;
        
                // Regitrar elementos que causan que se ejecute el calculo (Adición de eventos)
                for(var k in cols) {
                    reg = "\\b" + k + "\\b";
                    var reg = new RegExp(reg);
                    // Definir que elementos tienen evento
                    if( reg.test(formula)) {
                        if(cols[k].type != '')
                            cols[k]["event"] = true;
                    }
                }
            }
        }

        /**
        * Prepara los evento que son adicionados a los elementos dentro del grid
        * @param string col Nombre de la columna
        */
        function setEvents() {
            for(k in cols) {
                if(cols[k].event) {
                    var pos = parseInt(cols[k]['pos']) + 1;
                    var exp = 'tr td:nth-child(' + pos + ') ' + cols[k].type;
                    // Maldito Internet Explorer, no es posible usar "live"
                    if(cols[k].type == 'input[type="text"]' || cols[k].type == 'textarea' || cols[k].type == 'select' ) {
                        $(table).find(exp).unbind("change");
                        $(table).find(exp).change( function(e) {
                            fireCellEvent(e);
                        });
                    }else if( cols[k].type == 'input[type="checkbox"]') {
                        $(table).find(exp).unbind("click");
                        $(table).find(exp).click( function(e) {
                            fireCellEvent(e);
                        });
                    }
                }
            }
        }

        /**
         * Calcula la formula que se la hay enviado en la fila
         * @param String col Columna
         * @param DOM row Fila de la cual se ejecuta la formula
         */
        function calculateFormula(col, pos) {
            var pat = cols[col].formula.match(/\b[a-z_-]+[0-9]*\b/ig);
            var formu = cols[col].formula;
            var row = $(table).find('tr:eq('+ pos + ')');
            // Solución para IE
            for(var k in pat) {
                if(!/^\d+$/.test(k)) {
                    delete(pat[k]);
                }
            }
            var columns = []
            // Se prepara la formula para ser calculada
            for(var k in pat) {
                var exp = 'td:eq(' + cols[pat[k]].pos + ') ' + cols[pat[k]].type;
                var val = 0;
                if(cols[pat[k]].type == 'input[type="checkbox"]') {
                    val = $(row).find(exp).attr('checked') ? 1 : 0;
                }else if(cols[pat[k]].type == 'input[type="text"]'){
                    val = parseFloat( $(row).find(exp).val() ) || 0
                }
                var reg = new RegExp('\\b' + pat[k] + '\\b')
                formu = formu.replace(reg, val);
                columns.push(pat[k]);
            }
            
            var res = eval(formu);
            res = res.toFixed(config.decimals);
            // Posicionando la respuesta correspondiente
            var cell = $(row).find('td:eq(' + cols[col].pos + ')');
            if(cols[col].type == "") {
                $(cell).html(res);
            }else{
                $(cell).find(type).html(res);
            }
            for(var i=0, l=columns.length ; i< l; i++) {
                //console.log(cols[columns[i]]);
                if(cols[columns[i]].summary)
                    calculateSummary(columns[i]);
            }
            calculateSummary(col);
        }

        /**
         * Encuentra un valor o valores
         * @param string bus Parametro de busqueda
         * @param string prop Proiedad de la columna a buscar
         * @return object Retorna la parte delobjeto de la columna
         */
        function findColBy(bus, prop) {
            for(var k in cols) {
                if(bus == cols[k][prop]) {
                    return cols[k];
                }
            }
        }

        /**
         * Función que adiciona una nueva fila basada en el primera fila que permite edición
         */
        function addRow() {
            var tr = $(table).find('tr:not(.noedit):first').clone();
            if(!config.addedRow) {
                var control = $(table).find('tr:not(.noedit):last').find('input, select, textarea')[0] || false;
                // Determinar el número de fila del los controles
                if(control.name) {
                    config["formPos"] = parseInt( control.name.replace(/^.*\[([0-9]+)\].*$/ig, "$1") ) || '';
                }
                config.addedRow = true
            }
            if(config.formPos !== '')
                config.formPos++;

            if($(tr).find("input, select, textarea").length > 0) {
                $(tr).find("input, textarea, select").each(function(index, elem) {
                    var newName = '';
                    if(config.formPos !== '') {
                        newName = elem.name.replace(/\[[0-9]+\]/i, '[' + config.formPos + ']');
                    }else {
                        newName = elem.name;
                    }
                    if(elem.type == 'checkbox' || elem.type == 'radio') {
                         $(elem).attr({'name': newName, 'checked': false})
                    }else {
                         $(elem).attr({'name': newName, 'value': ''});
                    }
                    $(elem)
                });
                $(tr).find("input[type=radio], input[type=checkbox]").attr('checked', false);
            }
            if(cols[k].type == "" && cols[k].formula)
                $(tr).find("td:eq(" + cols[k].pos + ")").html('');
            if(config['countRow']) {
                var fila = parseInt($(table).find('tr:not(.noedit):last td:eq('+ config['countRowRow'] +')').html()) + 1;
                $(tr).find('td:eq('+ config['countRowRow'] +')').html(fila);
            }
            $(table).find('tr:not(.noedit):last').after(tr);
            // Regitrar elementos que causan que se ejecute el calculo (Adición de eventos)
            setEvents();
            for(var kk in cols){
                if(cols[kk].summary)
                    calculateSummary(cols[kk].name);
            }
        }
        
        /**
         * Permite borrar una fila
         */
        function delRow(elem) {
            if($(table).find('tr:not(.noedit)').length > 1 ) {
                $(elem).parents('tr').eq(0).remove();
                if(config['countRow']) {
                    rowNumber();
                }
            }
            for(var k in cols) {
                  if(cols[k].summary)
                      calculateSummary(k);
            }
        }

        /**
         * Numera las filas cuando se borran
         */
        function rowNumber() {
            $(table).find('tr:not(.noedit) td:eq('+config['countRowRow']+')').each(function(index, elem) {
                var ind = index + 1;
                $(elem).html(ind);
            });
        }
        
        return {
            cols: cols,
            summaryRow: summaryRow,
            table: table,
            formulaSet: formulaSet,
            calculateFormula: calculateFormula,
            setGrider: setGrider,
            setColumn: setColumn,
            fireCellEvent: fireCellEvent,
            setColType: setColType,
            findColBy: findColBy,
            addRow: addRow,
            addRowWithTab: addRowWithTab,
            delRow: delRow,
            rowNumber: rowNumber
        }
    }

    $.Grider.events = function() {
        return 'nuevo';
    }

})(jQuery);
