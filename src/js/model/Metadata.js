Ext.regModel('Table', {
	fields: [
		{name: 'id', type: 'string'},
		{name: 'name', type: 'string'},
		{name: 'type', type: 'string'}, // view or table
		{name: 'nameSet', type: 'string'},
		{name: 'extendable', type: 'boolean'},
		{name: 'editable', type: 'boolean'},
		{name: 'belongs', type: 'string'},
		{name: 'deletable', type: 'string'},
		{name: 'mainMenu', type: 'boolean'},
		{name: 'level', type: 'int'},
		//from Dep
		{name: 'editing', type: 'boolean'},
		{name: 'count', type: 'int'},
		{name: 'contains', type: 'boolean'},
		{name: 'aggregates', type: 'string'},
		{name: 'stats', type: 'string'},
		{name: 'hidden', type: 'boolean'},
		{name: 'clsColumn', type: 'string'},
		{name: 'loading', type: 'boolean'},
		{name: 'filtered', type: 'boolean'},
		{name: 'template', type: 'string'},
		{name: 'templateConfig', type: 'string'},
		{name: 'grouperColumn', type: 'string'},
		{name: 'sorterColumn', type: 'string'},
		{name: 'sorterDir', type: 'string'},
		{name: 'primaryTable', type: 'string'}
	],
 	associations: [
		{type: 'hasMany', model: 'Column', name: 'columns'},
		{type: 'hasMany', model: 'Column', name: 'deps', foreignKey: 'parent'}
	],
	proxy: {
		type: 'memory',
		reader: {
			type: 'json',
			root: 'tables'
		}
	},
	hasIdColumn: function() {
		return this.columns().findExact('name', 'id') !== -1 ? true : false;
	},

	hasNameColumn: function() {
		return this.columns().findExact('name', 'name') !== -1 ? true : false;
	},

	hasAggregates: function() {
		return this.getAggregates().getCount() > 0 ? true : false;
	},
	getAggregates: function() {
		return this.columns().queryBy(function(rec) {return rec.get('aggregable') ? true : false;});
	},
	hasExtendableDep: function() {

		var tableStore = Ext.getStore('tables'),
			depStore = this.deps(),
			result = false
		;

		depStore.each(function(dep) {

			result = tableStore.getById(dep.get('table_id')).get('extendable');
			return !result;
		});
		return result;
	},
	getTitleColumns: function() {
		return this.columns().queryBy(function(rec) {return rec.get('title') == true ? true : false;});
	},
	getParentColumns: function() {
		return this.columns().queryBy(function(rec) {return rec.get('parent') ? true : false;});
	}
});


Ext.regModel('Column', {
	fields: [
		{name: 'id', type: 'string'},
		{name: 'name', type: 'string'},
		{name: 'label', type: 'string'},
		{name: 'type', type: 'string'},
		{name: 'table_id', type: 'string'},
		{name: 'key', type: 'boolean'},
		{name: 'aggregable', type: 'string'},
		{name: 'parent', type: 'string'},
		{name: 'contains', type: 'boolean'},
		{name: 'editable', type: 'boolean'},
		{name: 'title', type: 'boolean'},
		{name: 'init', type: 'string'},
		{name: 'compute', type: 'string'},
		{name: 'template', type: 'string'},
		{name: 'templateConfig', type: 'string'},
		{name: 'serverPhantom', type: 'boolean'},
		{name: 'importFields', type: 'string'},
		{name: 'optional', type: 'boolean'},
		{name: 'predicate-for', type: 'string'},
		{name: 'primaryTable', type: 'string'},
		{name: 'cls', type: 'string'},
        {name: 'filterByModel', type: 'string'}
	],
	associations: [
		{type: 'belongsTo', model: 'Table'},
		{type: 'hasMany', model: 'Column', name: 'predicates', foreignKey: 'predicate-for'}
	]
});

Ext.regModel('Dep', {
	fields: [

	]
});

Ext.regStore('tables', {
	model: 'Table',
	listeners: {
		load: function(store, records, s) {
			addMainMenu(store, records);
		}
	}
});

var addMainMenu = function(store, tables) {

	var mainMenu = Ext.ModelMgr.create({
		id: 'MainMenu',
		name: 'Основные понятия'
	}, 'Table');

	mainMenu.columns().add (
		{id: 'MainMenuid', type: 'string', name: 'id', label: 'Пользователь', table_id: 'MainMenu'}
	)

	var mmDeps = mainMenu.deps();

	Ext.each(tables, function(table) {
		if((table.deps().getCount() > 0
			&& table.get('nameSet')
			&& !table.get('hidden')
			&& (function(table){
				var cnt = 0;
				Ext.each(table.raw.columns, function(column) {
					cnt += column.key ? 1 : 0;
				});
				return cnt;
			}) (table) == 1) || table.get('mainMenu')
		) {
			mmDeps.add({
				id: table.getId() + 'id',
				table_id: table.getId()
			});
		}
	});

	store.add(mainMenu);
};
