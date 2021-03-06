Ext.util.Format.defaultDateFormat = 'd/m/Y';
Date.monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

var accessTokenFromLocation = function () {
	var test = location.search.match(/access-token=([^&]*)/);

	if (test) return test[1];

	return false;

}


var tableHasColumn = function (tbl, column) {
	var table = Ext.getStore('tables').getById(tbl),
		columns = table && table.columns()
	;
	return columns && columns.getById(table.getId() + column)
}

var tableProperty = function (tbl, property) {
	var table = Ext.getStore('tables').getById(tbl);
	return table.get(property);
}

var lowercaseFirstLetter = function (string) {

    return string.charAt(0).toLowerCase() + string.slice(1);

};

var uppercaseFirstLetter = function (string) {

    return string.charAt(0).toUpperCase() + string.slice(1);

};

var getParentInfo = function(field, value) {

	var parentStore = Ext.getStore(field[0].toUpperCase() + field.substring(1));
	var rec = parentStore.getById(value);

	return new Ext.XTemplate(getItemTplMeta(rec.modelName, {useDeps: false}).itemTpl).apply(rec.data);
};

var getBoolText = function (value) {
	return value ? 'Да' : 'Нет';
}


var getItemTplCompute = function(modelName, config) {

	var tableStore = Ext.getStore('tables'),
		tableRecord = tableStore.getById(modelName),
		columnStore = tableRecord.columns(),
		filterObject = config.filterObject,
		groupField = config.groupField,
		useDeps = config.useDeps !== false ? true : false,
		onlyKey = config.onlyKey === true ? true : false
	;

	var modelForDeps = undefined;

	var templateString = '<div class="hbox {cls}">'
		+		'<div class="data">'
		+			'<tpl if="hasName">'
		+				'<p class="name<tpl if="clsColumn"> \\{{clsColumn}\\}</tpl>">\\{name\\}</p>'
		+			'</tpl>'
		+			'<tpl if="!hasName && keyColumnsLength &gt; 0">'
		+				'<p class="key">'
		+					'<tpl for="keyColumns">'
		+						'<tpl if="parent && !parentInfo">'
		+							'<span class="{cls}">\\{{name_br}\\}<tpl if="!end"> : </tpl></span>&nbsp;'
		+						'</tpl>'
		+						'<tpl if="parent && parentInfo">'
		+							'<div class="parent-info">\\{[getParentInfo("{name}", values.{name})]\\}</div>'
		+						'</tpl>'
		+						'<tpl if="!parent">'
		+							'<tpl if="boolType">'
		+								'<span>{label}-'
		+								'\\{\\[getBoolText(values.{name})\\]\\}'
		+								'</span>'
		+							'</tpl>'
		+							'<tpl if="!boolType">'
		+								'<span class="{cls}">\\{{name}\\}</span>'
		+							'</tpl>'
		+							'<tpl if="!end"><span>: </span></tpl>'
		+						'</tpl>'
		+					'</tpl>'
		+				'</p>'
		+			'</tpl>'
		+			'<div class="{[values.keyColumnsLength > 0 ? "other" : ""]}">'
		+				'<tpl if="otherColumnsLength &gt; 0">'
		+					'<small class="other-fields">'
		+						'<tpl for="otherColumns">'
		+							'<tpl if="parent">'
		+								'<tpl if="label || name">'
		+									'{renderTpl}'
		+								'</tpl>'
		+							'</tpl>'
		+							'<tpl if="!(parent||template)">'
		+								'<tpl if="label || name">'
		+									'<div class="{cls}"><tpl if="name">{name}</tpl></div>'
		+								'</tpl>'
		+							'</tpl>'
		+							'<tpl if="template">'
		+								'<div class="{cls}">{label} : {template}</div>'
		+							'</tpl>'
		+						'</tpl>'
		+					'</small>'
		+				'</tpl>'
		+			'</div>'
		+		'</div>'
		+		'{buttons}'
		+	'</div>'
	;

	var renderTpl = function(name_br,name,label) {
		return '<tpl if="'+name+'"><div>'
			+ '<span class="label-parent x-button">'
			+	'<input type="hidden" property="'+name+'" value="{'+name+'}" />'
			+	label
			+ '</span>'
			+ ': {'+name_br+'}'
		+ '</div></tpl>'
	}

	var buttons =
		'<div class="buttons">'
			+ '<tpl for="deps">'
				+ '<tpl if="count &gt; 0 || extendable">'
				+	'<div class="hbox dep">'
				+ 		'<input type="hidden" value="{id}" />'
				+ 		'<div class="count"><tpl if="count &gt; 0">{count}</tpl></div>'
				+ 		'<div class="stats"><tpl if="stats &gt; 0">{stats}</tpl></div>'
				+ 		'<div class="data">{nameSet}</div>'
				+ 		'<div class="aggregates">{aggregates}</div>'
				+ 		'<tpl if="extendable && (!editing && !contains || editing && contains)"><div class="x-button extend add">+</div></tpl>'
				+ 	'</div>'
				+ '</tpl>'
 			+ '</tpl>'
 		+ '</div>';

	var templateData = {
		hasName: false,
		keyColumnsLength: 0,
		keyColumns: [],
		otherColumnsLength: 0,
		otherColumns: [],
		buttons: useDeps && !onlyKey ? buttons : '',
		cls: '<tpl if="needUpload">needUpload</tpl>',
		clsColumn: tableRecord.get('clsColumn')
	};

	var idColExist = columnStore.findExact('name', 'id') === -1 ? false : true;
	var queryValue = idColExist ? 'parent' : 'key',
		nameColumnIdx = columnStore.findExact('name', 'name')
	;

	if(nameColumnIdx != -1 && columnStore.getAt(nameColumnIdx).get('label')) {

		templateData.hasName = true;
		queryValue = 'key';

	} else {

		var keyColumns = columnStore.queryBy(function(rec) {
			return rec.get(queryValue)
				&& ( !filterObject || lowercaseFirstLetter(filterObject.modelName) != lowercaseFirstLetter(rec.get('name')))
				&& (groupField !== rec.get('name') ? true : false)
				&& !rec.get('optional');
		});

		templateData.keyColumnsLength = keyColumns.getCount();

		if(keyColumns.getCount() > 0) {

			var length = keyColumns.getCount();

			keyColumns.each(function(col) {

				var parentName = col.get('name')[0].toUpperCase() + col.get('name').substring(1),
					titleCols = undefined,
					parentInfo = false && keyColumns.getCount() === 1 && !tableRecord.hasIdColumn()
				;

				if(col.get('parent')) {
					titleCols = tableStore.getById(parentName).getTitleColumns();
					length += titleCols.getCount();
				}

				templateData.keyColumns.push({
					parent: col.get('parent') ? true: false,
					name: col.get('name'),
					name_br: col.get('parent') ? parentName + '_name' : col.get('name'),
					parentInfo: parentInfo,
					end: keyColumns.indexOf(col) + 1 >= length,
					boolType: col.get('type') == 'boolean',
					label: col.get('label')
				});

				titleCols && !parentInfo && titleCols.each(function(tCol) {

					templateData.keyColumns.push({
						parent: true,
						cls: 'title',
						name: tCol.get('name'),
						name_br: parentName + '_' + tCol.get('name'),
						parentInfo: false,
						end: titleCols.indexOf(tCol) + keyColumns.indexOf(col) + 2 >= length
					});
				});
			});
		}

		if(keyColumns.getCount() == 1 && !tableRecord.hasIdColumn()) {
			modelForDeps = keyColumns.getAt(0).get('parent');
		}
	}

	var tplConfig = {};

	if(!onlyKey) {

		var otherColumns = columnStore.queryBy(function(rec) {
			var colName = rec.get('name');
			return (!rec.get(queryValue) || rec.get('optional'))
				&& ( !groupField || (groupField !== colName
						&& groupField[0].toLowerCase() + groupField.replace('_name', '').substring(1) !== colName)
				)
				&& ( !filterObject || lowercaseFirstLetter(filterObject.modelName) != lowercaseFirstLetter(rec.get('name')))
				&& colName !== 'id' && colName !== 'name' && rec.get('label') ? true : false;
		});

		templateData.otherColumnsLength = otherColumns.getCount();
		if(otherColumns.getCount() > 0) {

			otherColumns.each(function(col) {

				var label = undefined,
					name = undefined,
					colName = col.get('name')
				;

				if (col.tplConfig) {
					Ext.apply (tplConfig, col.tplConfig);
				}

				switch(col.get('type')) {
	 				case 'boolean' : {
						name = '{[values.' + colName + ' == true ? "' + col.get('label') + '" : ""]}';
						break;
					}
					case 'date' : {
						label = col.get('label');
						name = '<tpl if="' + colName + '">' + label + ' : {[Ext.util.Format.date(values.' + colName + ')]}</tpl>';
						break;
					}
					case 'float' : {
						label = col.get('label');
						name = '<tpl if="' + colName + '">' + label + ' : {[values.' + colName + '.toDisplayString()]}</tpl>';
						break;
					}
					default : {
						label = col.get('label');
						name = col.get('parent')
							? colName
							: '<tpl if="' + colName + '">' + label + ' : {' + colName + '}</tpl>';
						break;
					}
				}

				var isTitle = col.get('title');

				templateData.otherColumns.push({
					parent: col.get('parent') ? true : false,
					label: label,
					cls: colName === 'processing' ? colName + ' is-{' + colName + '}' : colName + (isTitle ? ' title' : ''),
					name: name,
					template: col.get('template'),
					renderTpl: renderTpl(colName[0].toUpperCase() + colName.substring(1) + '_name', name, label)
				});

				templateData.cls += (colName === 'processing' ? ' is-{' + colName + '}' : '');

			});
		}
	}

	var res = {
		itemTpl: new Ext.XTemplate(templateString).apply(templateData),
		modelForDeps: modelForDeps
	};

	if (tplConfig) {
		res.itemTpl = new Ext.XTemplate(res.itemTpl,tplConfig);
	}

	return res;
};

var getItemTpl = function (modelName) {

	var res = getItemTplStatic (modelName);

	!res && (
		res = getItemTplCompute (modelName, {useDeps:false}).itemTpl
	);

	return res;

};


var getItemTplMeta = function (modelName, config) {

	var tpl = getItemTplStatic (modelName);

	if (tpl) {
		return Ext.apply ({
			itemTpl: tpl
		}, config)
	}

	return getItemTplCompute (modelName, config);

}

Ext.apply(Number.prototype, {
	toDecimal: function (d) {
		return parseFloat(this.toFixed(d))
	},
	toDisplayString: function(d) {
		d = (d>=0?d:2);
		return this.toDecimal(d).addCommas(d).replace(/\,/g,'&nbsp;').replace(/\./g,',');
	},
	addCommas:  function(d){
		var nStr  = this.toString() + '';
		x = nStr.split('.');
		x1 = x[0];
		x2 = x.length > 1 ? '.' + x[1] : (d ? ('.' + Array(d+1).join(0)) : '');
		var rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1' + ',' + '$2');
		}
		return x1 + x2;
	},
	toStringNot0: function(suffix) {
		return this != 0 ? this.toString() + (suffix ? suffix.toString() : '') : '';
	}
});

Ext.apply(String.prototype, {

	divify: function(delimiter) {
		var r = '';
		Ext.each(this.split(delimiter),function (s) {
			r += '<div>'+s+'</div>'
		});
		return r;
	},

	toSpan: function (cls) {
		return ('<span class="'+cls+'">'+this+'</span>')
			.replace(/ class=("undefined"|"")/,'')
	},

	else: function(fv) {
		return this.length ? this.concat() : fv
	},

	if: function(c) {
		return c ? this.concat() : ''
	},

	tpl01: function (arr, divider) {

		var res = this,
			me = this
		;

		typeof arr != 'array'
			&& (arr = [arr || ['1']])
		;

		Ext.each (arr, function (a) {
			res += (divider||'') + me.replace(/0/g,a)
		});

		return res;
	},

	tplIf: function (o) {

		typeof o == 'string' && (
			o = { elem: o }
		);

		var me = this,
			replacer = function (p) {
				return o[p.replace('$','')] || me.toString()
			}
		;

		return '<tpl if="$cond"><$elem>{$vname}</$elem></tpl>'.replace(
			/(\$[a-z]*(?=\>|\<|\"|\}))/g, replacer
		);

	},

	dateFormat: function(fmt) {
		return this;
	}

});

var getItemTplStatic = function (modelName) {

	var model = Ext.ModelMgr.getModel(modelName);

	if (model && model.tpl)
		return new Ext.XTemplate(model.tpl, model.tplConfig)
	;

	switch(modelName) {
		case 'BonusProgramByCustomer':
			return '<div class="hbox"><div class="data">'
						+'<p class="name">{name}</p>'
						+'<div>'
							+'<small class="other-fields">'
								+'<div class="goal"><tpl if="goal">Выполни : {goal}</tpl></div>'
								+'<div class="gain"><tpl if="gain">Получи : {gain}</tpl></div>'
								+'<div class="msg blue"><tpl if="msg">Сообщение : {msg}</tpl></div>'
							+'</small>'
						+'</div>'
					+'</div></div>'
		;
		case 'Dep':
			return '<div class="hbox dep <tpl if="loading">loading</tpl>">'
					+	'<div class="count"><tpl if="count &gt; 0">{count}</tpl></div>'
					+	'<div class="stats"><tpl if="stats != \'0\'">{stats}</tpl></div>'
					+	'<div class="data">{nameSet}</div>'
					+	'<div class="aggregates">{aggregates}</div>'
					+	'<tpl if="extendable && (!editing && !contains || editing && contains)"><div class="x-button extend add">+</div></tpl>'
				 + '</div>'
		;
		case 'Debt-' :
			return '<div class="hbox dep">'
					+ '<div class="data">'
					+	'<div>Дата: {[Ext.util.Format.date(values.ddate)]} Документ№: {ndoc} Сумма: {[values.fullSumm]} <tpl if="isWhite">Нужен чек</tpl></div>'
					+	'<div>Остаток задолженности: {[parseFloat(values.remSumm).toFixed(2)]}</div>'
					+ '</div>'
					+ '<div class="encashSumm"><tpl if="encashSumm &gt; 0">{[parseFloat(values.encashSumm).toFixed(2)]}</tpl></div>'
				 + '</div>'
		;

		case 'ShipmentProduct':
			return '<div class="data">'
				+		'<div class="date">Дата: {[Ext.util.Format.date(values.date)]}</div>'
				+		'<small>'
				//+			'<div class="name">Товар: {name}</div>'
				+			'<div class="price">Цена: {price}</div>'
				+			'<div class="volume">Количество: {volume}</div>'
				+		'</small>'
				+	'</div>';
		;

	}

	return false;

};

var createFieldSet = function(columnsStore, modelName, view, fieldItitConfig) {

	var fsItems = [];

	columnsStore.each(function(column) {

		if (column.get('label') && column.get('name') !== 'processing') {

			var field = Ext.apply({
				name: column.get('name'),
				itemId: column.get('name'),
				label: column.get('label'),
				disabled: !column.get('editable'),
                placeHolder: column.get('placeholder'),
			},fieldItitConfig);

			var fieldCls = column.get('cls');

			if (fieldCls) {
				field.cls = fieldCls;
			}

			var fieldConfig;

			switch(column.get('type')) {

				case 'boolean':
					fieldConfig = {
						xtype: 'togglefield',
						listeners: {
							change: function(slider, thumb, newV, oldV) {
								Ext.dispatch({
									controller: 'Navigator',
									action: 'onNavigatorFieldValueChange',
									field: slider,
									newValue: newV,
									oldValue: oldV
								});
							}
						}
					};
				break;

				case 'date':
					fieldConfig = {
						xtype: 'datepickerfield',
						picker: {
							yearFrom: (new Date).getFullYear(),
							yearTo  : (new Date).add('d',14).getFullYear(),
							slotOrder: ['day', 'month', 'year']
						}
					};
				break;

				default :
					if(column.get('name') == 'name' && !IOrders.newDesign) {
						var selectStore = createStore(modelName, getSortersConfig(modelName, {}));
						selectStore.load();
						selectStore.add(view.objectRecord);
						fieldConfig = {
							xtype: 'pagingselectfield',
							name: 'id',
							store: selectStore,
							valueField: 'id', displayField: 'name'
						};
					} else {
						fieldConfig = {xtype: 'textfield'};
					}
				break;
			}

			var tpl = column.get('template');

			if (tpl) {
				field.template = new Ext.XTemplate(tpl);
				fieldConfig = {xtype: 'templatefield', cls: 'x-field-readonly'};
			}

			if (view.isNew && !column.get('editable'))
				fieldConfig = undefined
			;

			var parentName = column.get('parent'),
				parentStore = Ext.getStore(parentName)
			;

			if (parentStore) {

				predicateFilters = [];

				column.predicates().each(function(predicate) {

					predicateFilters.push ({
						property: predicate.get('name'),
						value: predicate.get('init'),
						exactMatch: true
					})

				});

				parentStore.clearFilter(true);

				if (predicateFilters.length) {
					parentStore.filter(predicateFilters);
				}

				fieldConfig = {
					xtype: 'selectfield',
					store: parentStore,
					valueField: 'id',
					displayField: 'name',
					onFieldLabelTap: true,
					onFieldInputTap: true,
					clsColumn: tableProperty(parentName,'clsColumn'),
					getListPanel: function() {
						Ext.form.Select.prototype.getListPanel.apply(this, arguments);
						this.setItemTplWithTitle();
						return this.listPanel;
					}
				}

				var importFields = column.get('importFields');

				if (importFields) {
					fieldConfig.importFields = [];
					Ext.each(importFields.split(' '), function(fieldToImport) {
						fieldConfig.importFields.push({
							name: fieldToImport.match(/^[^:]*/)[0],
							toName: fieldToImport.match(/[^:]*$/)[0]
						});
					})
				}

			}

			fieldConfig
				&& fsItems.push(Ext.apply(field,fieldConfig))
			;

		}
	});

	return { xtype: 'fieldset', items: fsItems , itemId: 'formFields'};
};

var createFilterField = function(objectRecord, onLoadCallback) {

	var modelName = objectRecord.modelName,
		listGroupedConfig = getGroupConfig(modelName),
		sortersConfig = getSortersConfig(modelName, listGroupedConfig),
	    selectStore = createStore(modelName, Ext.apply(listGroupedConfig, sortersConfig))
	;

	selectStore.load(function(records, operation, success) {

	    if (success) {

			if (! this.data.findBy(function(o) { return o.get('id') == objectRecord.getId() }))
				selectStore.add(objectRecord)
			;

			if (typeof onLoadCallback == 'function') {
				onLoadCallback(records, operation, success)
			}
		}

	});

	return {
		xtype: 'fieldset',
		items: {
			xtype: 'filterfield',
			store: selectStore,
			onFieldLabelTap: true,
			onFieldInputTap: true,
			name: 'id',
			label: Ext.getStore('tables').getById(modelName).get('name'),
			valueField: 'id',
			displayField: 'name'
		}
	};
};

function createDepsList(depsStore, tableStore, view) {

	view.depStore = new Ext.data.Store({
		model: 'Dep',
		remoteFilter: false,
		remoteSort: false,
		data: getDepsData(depsStore, tableStore, view),
		countFilter: new Ext.util.Filter({
		    filterFn: function(item) {
		        return item.get('count') > 0 || item.get('extendable');
		    }
		}),
		listeners: {
			update: function(grid, rec) {
				tableStore.getById(rec.getId()).set(rec.data);
			}
		}
	});

	return view.depList = Ext.create({
		xtype: 'list',
		cls: 'x-deps-list',
		scroll: false,
		disableSelection: true,
		itemTpl: getItemTpl('Dep'),
		store: view.depStore
	});
};

var getDepsData = function(depsStore, tablesStore, view, config) {

	var data = [];

	depsStore.each(function(dep) {

		var depTable = tablesStore.getById(dep.get('table_id')),
			isSetView = view === undefined && config
		;

		if((depTable.get('nameSet') && depTable.get('id') != 'SaleOrderPosition'
				|| (isSetView ? config.record.modelName == 'SaleOrder' : view.objectRecord.modelName == 'SaleOrder'))
		   && (isSetView ? config.record.modelName !== depTable.get('id') : true)) {

			var filterBy = dep.get('name') || lowercaseFirstLetter(dep.get('parent'));

			if (filterBy == 'mainMenu') filterBy = undefined;

			depRec = depTable.copy();
			depRec.set('contains', dep.get('contains'));
			depRec.set('editing', view ? view.editing : false);
			depRec.set('filterBy', filterBy);

			loadDepData(depRec, depTable, view, config ? Ext.apply(config, {data: data}) : undefined);

			if(isSetView) {
				data.push(depRec.data);
			} else {
				data.push(depRec);
			}
		}
	});

	return data;
};

var loadDepData = function(depRec, depTable, view, config, force) {

	var modelProxy = Ext.ModelMgr.getModel(depTable.get('id')).prototype.getProxy(),
		filters = [],
		recordForDeps = undefined,
		isSetView = view === undefined && config
	;

	if(view && view.objectRecord.modelName != 'MainMenu') {
		filters.push({
			property: depRec.get('filterBy'),
			value: view.objectRecord.getId()
		});
		depRec.set('filtered', true);
	} else if (isSetView) {
		recordForDeps = config.list.modelForDeps && !config.hasIdColumn
			? Ext.getStore(config.list.modelForDeps).getById(
				config.record.get(
					lowercaseFirstLetter(config.list.modelForDeps[0]) + config.list.modelForDeps.substring(1)
				)
			)
			: config.record;

		if(recordForDeps.modelName != 'MainMenu') {
			filters.push({
				property: lowercaseFirstLetter(recordForDeps.modelName),
				value: recordForDeps.getId()
			});
			depRec.set('filtered', true);
		}
	}

	if(!depRec.get('count') || depRec.get('filtered') || depRec.get('expandable') || force || true) {

		var aggCols = depTable.getAggregates();
		var aggOperation = new Ext.data.Operation({depRec: depRec, filters: filters});

		modelProxy.aggregate(aggOperation, function(operation) {

			if (aggCols) {
				var aggDepResult = '';
				var aggDepTpl = new Ext.XTemplate(
					'<tpl if="value"><tpl if="name">{name} : </tpl>{[values.value.toDisplayString()]} </tpl>'
				);
				var aggResults = operation.resultSet.records[0].data;

				(!view || !view.objectRecord || (view.objectRecord.modelName != 'MainMenu')) && aggCols.each(function(aggCol) {
					aggDepResult +=
						aggDepTpl.apply({
							name: aggCol.get('label') != depTable.get('nameSet')
								? aggCol.get('label')
								: '', value: aggResults[aggCol.get('name')]
						})
					;
				});

				operation.depRec.set('aggregates', aggDepResult);
			}

			operation.depRec.set('count', aggResults.cnt);

			if(isSetView) {

				config.record.data.deps = config.data;
				config.list.store && config.list.refreshNode(config.list.indexOf(config.record));

				config.list.doComponentLayout();
			}
		});

		var t = depTable;

		if(t && t.columns && t.columns().findBy(function(c){return c.get('name')=='processing';}) > 0) {

			filters.push({property: 'processing', value: 'draft'});

			var countOperation = new Ext.data.Operation({depRec: depRec, filters: filters});
			modelProxy.aggregate(countOperation, function(operation) {

				var aggResults = operation.resultSet.records[0].data;
				operation.depRec.set('stats', aggResults.cnt);

				if(isSetView) {

					config.record.data.deps = config.data;
					config.list.store && config.list.refreshNode(config.list.indexOf(config.record));

					config.list.doComponentLayout();
				}
			});
		}
	}

	if(filters.length == 0) {
		depRec.set('filtered', false);
	}
};

var createTitlePanel = function(t) {

	var htmlTpl = new Ext.XTemplate('<div>{title}</div>');

	return {
			xtype: 'panel',
			cls: 'x-title-panel',
			html: htmlTpl.apply({title: t})
	};
};

var createNavigatorView = function(rec, oldCard, isSetView, editing, config) {

	var view = Ext.apply({
			xtype: 'navigatorview',
			layout: IOrders.newDesign && rec.get('name') ? {type: 'hbox', pack: 'justify', align: 'stretch'} :
				'fit',
			isObjectView: isSetView ? undefined : true,
			isSetView: isSetView ? true : undefined,
			objectRecord: isSetView ? oldCard.objectRecord : rec,
			tableRecord: isSetView ? rec.get('id') : undefined,
			editing: editing,
			extendable: rec.get('extendable'),
			ownerViewConfig: {
				xtype: oldCard.xtype || 'navigatorview',
				layout: IOrders.newDesign ? {type: 'hbox', pack: 'justify', align: 'stretch'} : 'fit',
				extendable: oldCard.extendable,
				isObjectView: oldCard.isObjectView,
				isSetView: oldCard.isSetView,
				objectRecord: oldCard.objectRecord,
				tableRecord: oldCard.tableRecord,
				ownerViewConfig: oldCard.ownerViewConfig,
				storeLimit: oldCard.isSetView ? oldCard.setViewStore.currentPage * oldCard.setViewStore.pageSize : undefined,
				storePage: oldCard.isSetView && oldCard.setViewStore.currentPage,
				lastSelectedRecord: oldCard.lastSelectedRecord,
				scrollOffset: oldCard.form.scroller && oldCard.form.scroller.getOffset(),
				filterBy: oldCard.filterBy
			}
		}, config);

	return view;
};

var getGroupConfig = function(model) {

	var sorterProperty, grouperFunction;

	switch(model) {
		case 'EncashmentRequest':
		case 'Shipment':
		case 'SaleOrder' : {

			if (tableHasColumn (model, 'date')) {
				sorterProperty = 'date';
				grouperFunction = function(rec) {
					return Ext.util.Format.date(rec.get(sorterProperty));
				}
			}

			if (tableHasColumn (model, 'shipDate')) {
				sorterProperty = 'shipDate';
				grouperFunction = function(rec) {
					return rec.get('ShipDate_name') || rec.get('shipDate');
				}
			}

			if (tableHasColumn (model, 'customerDeliveryOption')) {
				sorterProperty = 'customerDeliveryOption';
				grouperFunction = function(rec) {
					return rec.get('CustomerDeliveryOption_name');
				}
			}

			return {
				getGroupString: grouperFunction,
				sorters: [{property: sorterProperty, direction: 'DESC'}],
				field: sorterProperty
			};
		}
		case 'BonusProgramByCustomer' : {
			return {
				sorters: [
					{property: 'isWithMsg', direction: 'desc'},
					{property: 'name', direction: 'ASC'}
				]
			};
		}
		case 'Product' : {
			return {
				getGroupString: function(rec) {
					return rec.get('firstName');
				},
				sorters: [{property: 'firstName', direction: 'ASC'}],
				field: 'firstName'
			};
		}
		case 'Category' : {
			return {
				getGroupString: function(rec) {
					return rec.get('ShopDepartment_name');
				},
				sorters: [
					{property: 'ShopDepartment_name', direction: 'ASC'}
				],
				field: 'ShopDepartment_name'
			};
		}
		case 'OfferCategory' : {
			var result = {
				getGroupString: function(rec) {
					return rec.get('ShopDepartment_name');
				},
				sorters: [
					{ property: 'ShopDepartment_ord' },
					{ property: 'ShopDepartment_name' },
					{ property: 'ord' },
					{ property: 'name' }
				],
				field: 'ShopDepartment_name'
			};

			var sorters = [];

			Ext.each (result.sorters, function(s, i) {
				if (tableHasColumn(model,s.property))
					sorters.push(s);
			});

			if (sorters.length) result.sorters = sorters;
			else delete result.sorters;

			return result;
		}
		default : {

			var grouperFunction, sorterProperty, direction, result = {}, gc;

			var meta=Ext.getStore('tables').getById(model);

			if (meta) {

				var
					sc = meta.get('sorterColumn'),
					scd = meta.get('sorterDir'),
					gcc
				;

				gc = meta.get('grouperColumn');

				if (gc)
					gcc = tableHasColumn(model,gc)
				;

				sorterProperty = sc || gc;
				direction = scd || 'ASC';

				if (gcc) {
					grouperFunction =  (gcc.get('type') == 'date')
						? function(rec) {
							return Ext.util.Format.date(rec.get(gc));
						}
						: grouperFunction = function(rec) {
							return rec.get(gc);
						}
					;
				}

			}

			if (!sorterProperty && tableHasColumn (model, 'date')) {
				sorterProperty = 'date';
				direction = 'DESC';
				gc = 'date';
				grouperFunction = function(rec) {
					return Ext.util.Format.date(rec.get(gc));
				};
			}

			if (sorterProperty && grouperFunction) {
				result = {
					sorters: [{
						property: sorterProperty,
						direction: direction
					}],
					field: sorterProperty,
					getGroupString: grouperFunction,
					groupField: gc
				}
			} else if (sorterProperty) {
				result = {
					sorters: [{
						property: sorterProperty,
						direction: direction
					}]
				}
			}

			return result;
		}
	}
};

var getSortersConfig = function(model, storeConfig) {

	var table = Ext.getStore('tables').getById(model),
		sortConfig = {sorters: storeConfig.sorters ? storeConfig.sorters : []},
		columns = table.columns()
	;

	var parentSort = true;

	var meta=Ext.getStore('tables').getById(model);

	if (meta) {

		var sc = meta.get('sorterColumn');

		var direction = meta.get('sorterDir') || 'ASC';

		if (sc) {
			sortConfig.sorters.push ({ property: sc, direction: direction });
			return sortConfig;
		}

	}

	if (columns.getById(table.getId() + 'datetime')) {
		sortConfig.sorters.push ({ property: 'datetime', direction: 'DESC' });
		parentSort = false;
	}

	if (columns.getById(table.getId() + 'ord')) {
		sortConfig.sorters.push ({ property: 'ord' });
		parentSort = false;
	}

	var column = columns.getById(table.getId() + 'name');

	if (column && !(column.compute || column.template)) {
		sortConfig.sorters.push ({ property: 'name' });
		parentSort = false;
	}

	if (parentSort) {

		var parentColumns = columns.queryBy(function(rec) {
			return rec.get('parent') ? true : false;
		});

		parentColumns.each (function(col) {
			columns.findExact('name', col.get('parent') + '_name') != -1
				&& sortConfig.sorters.push({property: col.get('name') + '_name'});
		});

	}

	return sortConfig;
};

var getNextWorkDay = function() {
	var today = new Date();
	var todayWeekDay = today.getDay();

	var addDays = todayWeekDay >= 5 && todayWeekDay <= 6 ? 7 + 1 - todayWeekDay : 1;
	return today.add(Date.DAY, addDays);
};

var getOwnerViewConfig = function(view) {
	return {ownerViewConfig: {
		xtype: view.xtype,
		layout: IOrders.newDesign ? {type: 'hbox', pack: 'justify', align: 'stretch'} : 'fit',
		extendable: view.extendable,
		isObjectView: view.isObjectView,
		isSetView: view.isSetView,
		objectRecord: view.objectRecord,
		tableRecord: view.tableRecord,
		ownerViewConfig: view.ownerViewConfig,
		storeLimit: view.isSetView ? view.setViewStore.currentPage * view.setViewStore.pageSize : undefined,
		storePage: view.isSetView && view.setViewStore.currentPage,
		lastSelectedRecord: view.lastSelectedRecord,
		scrollOffset: view.form.scroller && view.form.scroller.getOffset()
	}};
};

var changeBtnText = function(btn) {

	if(btn.altText) {
		var t = btn.text;
		btn.setText(btn.altText);
		btn.altText = t;
	}
};

var unavailBtnFuncMessage = function(btn, view) {

	switch(view.xtype) {
		case 'navigatorview' : {
			switch (btn.name) {
				case 'Edit' : {
					return {
						problem: 'Редактирование запрещено!',
						reason: 'Редактирование возможно только в статусе "Черновик"',
						howFix: 'Для редактирования записи переведите ее в статус "Черновик". Из статусов "Проверка", "На складе" это сделать нельзя.'};
				}
				case 'Delete' : {
					return {
						problem: 'Нельзя удалить запись!',
						reason: 'Удалить запись можно только в статусе "Черновик"',
						howFix: 'Для удаления записи переведите ее в статус "Черновик". Из статусов "Проверка", "На складе" это сделать нельзя.'};
				}
			}
		}
		case 'saleorderview' : {

		}
	}

	return undefined;

};

var checkRecordInUpload = function(xid) {

	var store = Ext.getStore('ToUpload');

	return store && store.findExact('id', xid) !== -1;
};
