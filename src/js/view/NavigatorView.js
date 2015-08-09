var NavigatorView = Ext.extend(AbstractView, {

	objectRecord: undefined,
	tableRecord: undefined,

	/**
	 * Own
	 */

	createItems: function() {

		var tablesStore = Ext.getStore('tables'),
			modelName = this.objectRecord.modelName,
		    table = tablesStore.getById(modelName),
		    formItems = [],
			me = this,
			statusesStore = Ext.getStore('statuses'),
			formConfig = {}
		;

		this.items = [];

		this.dockedItems[0].title = table.get('name');
		this.dockedItems[0].items.push (
			this.syncButton = this.createSyncButton()
		);

		//this.fbBtn = Ext.create({xtype: 'button', name: 'FacebookFeed', text: 'Новости', scope: this});
		//this.dockedItems[0].items.push(this.fbBtn);

		if(this.isObjectView) {

			table.columns().each( function (c) {
				var cName = c.get('name');

				if (String.right(cName, 10) == 'processing') {
					Ext.each(me.statusButtonsConfig (me, cName, c), function(item, idx) {
						formItems.push (item);
					});
				}
			});

			this.cls = 'objectView';

			if (this.objectRecord.modelName != 'MainMenu') {
				formConfig.plugins = [
					new Ext.plugins.PullRefreshPlugin({

						isLoading: table.get('loading'),

						render: function() {
							Ext.plugins.PullRefreshPlugin.prototype.render.apply(this, arguments);

							if(this.isLoading)
								this.setViewState('loading');
						},

						refreshFn: function(onCompleteCallback, pullPlugin) {
							this.list.pullPlugin = pullPlugin;
							IOrders.xi.fireEvent(
								'pullrefresh',
								modelName,
								onCompleteCallback
							);
						}

					})
				];
			}

			formItems.push(this.fieldSetConfig(this, table, modelName));

			var spacerExist = false,
				btnLockByStatus = this.objectRecord.fields.getByKey('processing')
					&& this.objectRecord.get('processing') !== 'draft'
					&& !this.objectRecord.get('serverPhantom')
			;

			if ( table.get('deletable') ) {

				this.dockedItems[0].items.push(
					{xtype: 'spacer'},
					{
						itemId: 'Delete',
						name: 'Delete',
						text: 'Удалить',
						scope: this,
						cls: btnLockByStatus ? 'disable' : ''
					}
				);

				spacerExist = true;

			}

			if(table.get('editable') || (this.editing && table.get('extendable'))) {

				spacerExist || this.dockedItems[0].items.push({xtype: 'spacer'});
				this.dockedItems[0].items.push({
					itemId: 'SaveEdit',
					name: this.editing ? 'Save' : 'Edit',
					text: this.editing ? 'Сохранить' : 'Редактировать',
					cls: !this.editing && btnLockByStatus ? 'disable' : '',
					scope: this
				});

			}

			table.get('extendable') && !table.get('belongs') && this.dockedItems[0].items.push({
				ui: 'plain', iconMask: true,
				itemId: 'Add', name: 'Add', iconCls: 'add',
				scope: this, disabled: this.editing
			});

			if (this.objectRecord.modelName === 'MainMenu') {

				this.dockedItems[0].items.push (
					{xtype: 'spacer'}
				);

				this.dockedItems[0].items.push ({
						iconMask: true,
						name: 'Prefs',
						iconCls: 'settings',
						scope: this
				});

			}

			if (!this.editable || this.objectRecord.modelName == 'SaleOrder')
				formItems.push(createDepsList(table.deps(), tablesStore, this))
			;

			if(IOrders.newDesign && table.hasNameColumn())
				this.createSideFilter()
			;


		} else if (this.isSetView) {

			this.cls = 'setView';
			this.dockedItems[0].title = tablesStore.getById(this.tableRecord).get('nameSet');

			if(this.objectRecord.modelName != 'MainMenu') {
				formItems.push(createFilterField(this.objectRecord));
			}

			formItems.push(this.theSetListConfig());

			var applySearch = function(field, event) {
				if (field.getValue() == '') {
					console.log ('Searcher cleared');
					Ext.dispatch({
						controller: 'Navigator',
						action: 'searcherFilterOff',
						view: me
					});
				} else {
					console.log ('Searcher value: ' + field.getValue());
					Ext.dispatch({
						controller: 'Navigator',
						action: 'searcherFilterOn',
						view: me,
						searchFor: field.getValue()
					});
				}
			};

			var table = tablesStore.getById(this.tableRecord),
				searcher = {
					xtype: 'searchfield',
					name: 'searcher',
					itemId: 'Searcher',
					placeHolder: 'Поиск',
					useMask: false,
					listeners:{
						change: applySearch,
						action: function(f,e) {
							console.log ('Searcher action');
						},
						focus: function (f,e) {
							setTimeout (function() {
								e.target.setSelectionRange (0, 9999);
							}, 1);
						}
					}
				}
			;

			var tbItems = this.dockedItems[0].items;

			tbItems.push({xtype: 'spacer'});

			tableHasColumn(table.getId(), 'name')
				&& tbItems.push (searcher)
			;

			table.get('extendable') && !table.get('belongs')
				&& tbItems.push({
					ui: 'plain', iconMask: true,
					name: 'Add', iconCls: 'add',
					scope: this
				}
			);
		}

		this.mon (this, 'activate', this.syncButton.rebadge);

		this.items.push(this.form = new Ext.form.FormPanel(Ext.apply({
				flex: 2,
				cls: 'x-navigator-form ' + this.cls,
				scroll: true,
				items: formItems,
				afterComponentLayout : function() {
					var scrollEl = this.scrollEl,
						scroller = this.scroller,
						parentEl;

					if (scrollEl) {
						parentEl = scrollEl.parent();

						if (scroller.horizontal) {
							scrollEl.setStyle('min-width', parentEl.getWidth(true) + 'px');
							scrollEl.setHeight(parentEl.getHeight(true) || null);
						}
						if (scroller.vertical) {
							scrollEl.setStyle('min-height', parentEl.getHeight(false) + 'px');
							scrollEl.setWidth(parentEl.getWidth(true) || null);
						}
						scroller.updateBoundary(true);
					}

					if (this.fullscreen && Ext.is.iPad) {
						Ext.repaint();
					}
				}
			}, formConfig))
		);
	},

	/**
	 * Overridden
	 */

	initComponent: function() {

		NavigatorView.superclass.initComponent.apply(this, arguments);
		this.mon (this,'show', this.loadData);
		this.addEvents ('saved');

	},

	loadData: function() {

		this.form.loadRecord(this.objectRecord);
		this.form.recordLoaded = true;
		this.isObjectView && this.setFieldsDisabled(!this.editing);

		//this.form.getComponent('statusToolbar').serverMessage = this.objectRecord.get('serverMessage');

	},

	setFieldsDisabled: function(disable) {

		if(this.isObjectView) {

			var table = Ext.getStore('tables').getById(this.objectRecord.modelName),
				columnStore = table.columns(),
				fields = this.form.getFields()
			;

			Ext.iterate(fields, function(fieldName, field) {

				var column = columnStore.getById(table.getId() + fieldName);

				if (!(column.get('template') || column.get('compute')))
					field.setDisabled(!column.get('editable') || disable);
			});

		}

	},

	theSetListConfig: function () {

		var tablesStore = Ext.getStore('tables'),
			listGroupedConfig = getGroupConfig(this.tableRecord),
			sortersConfig = getSortersConfig(this.tableRecord, listGroupedConfig),
			me=this
		;

		this.setViewStore = createStore(this.tableRecord, Ext.apply(listGroupedConfig, sortersConfig));

		var config = {
			xtype: 'list',
			itemId: 'list',
			plugins: function (view) {

				var res = [
					new Ext.plugins.ListPagingPlugin({autoPaging: true})
				];

				if (me.objectRecord.modelName == 'MainMenu')
					res.push(new Ext.plugins.PullRefreshPlugin({

						isLoading: tablesStore.getById(view.tableRecord).get('loading'),

						render: function() {
							Ext.plugins.PullRefreshPlugin.prototype.render.apply(this, arguments);

							if(this.isLoading)
								this.setViewState('loading');
						},

						refreshFn: function(onCompleteCallback, pullPlugin) {
							this.list.pullPlugin = pullPlugin;
							IOrders.xi.fireEvent(
								'pullrefresh',
								this.list.store.model.modelName,
								onCompleteCallback
							);
						}

					}))
				;

				return res;

			} (this),

			scroll: false,
			cls: 'x-table-list',
			grouped: listGroupedConfig.field ? true : false,
			disableSelection: true,
			onItemDisclosure: true,
			store: this.setViewStore
		};

		return Ext.apply( config,
			getItemTplMeta(
				this.tableRecord,
				{
					filterObject: this.objectRecord,
					groupField: listGroupedConfig.field
				}
			)
		)

	},

	createSideFilter: function() {

		var store = createStore(

			this.objectRecord.modelName,

			getSortersConfig(
				this.objectRecord.modelName,
				getSortersConfig(this.objectRecord.modelName,{})
			)

		);

		var limit = 0, curPage = 1, me=this;

		if(me.ownerViewConfig.tableRecord.modelName === me.objectRecord.modelName) {
			limit = me.ownerViewConfig.storeLimit;
			curPage = me.ownerViewConfig.storePage;
		};

		store.load({limit: limit});
		store.currentPage = curPage;

		this.items.push(me.objectList = Ext.create ({

			xtype: 'list',
			cls: 'sidefilter',
			flex: 1,
			plugins: limit !== 0 ? new Ext.plugins.ListPagingPlugin({autoPaging: true}) : undefined,
			itemTpl: getItemTplMeta(this.objectRecord.modelName, {useDeps: false, onlyKey: true}).itemTpl,
			store: store,

			initComponent: function() {
				var scroll = this.scroll;
				Ext.List.prototype.initComponent.apply(this, arguments);
				if (typeof scroll == 'object')
					this.scroll = scroll;
			},

			listeners: {

				scope: this,

				refresh: function(list) {
					if(list.store.getCount() > 1) {

						var idx = list.store.findExact('id', this.objectRecord.getId());

						list.selModel.select(idx);

						var item = Ext.fly(list.getNode(idx));

						item && list.scroller.setOffset({
							y: -item.getOffsetsTo(list.scrollEl)[1]
						});
					}
				},

				selectionchange: function(selModel, recs) {

					if(recs.length) {
						Ext.dispatch ({
							controller: 'Navigator',
							action: 'onObjectListItemSelect',
							selected: recs[0],
							view: me
						})
					}
				}
			}
		}));
	},

	statusButtonsConfig: function (me, cName, c) {

		var state = me.objectRecord.get(cName) || 'draft',
			btnCfg = {
				onTapStart: function() {

					if(!checkRecordInUpload(me.objectRecord.get('xid'))) {
						Ext.Button.prototype.onTapStart.apply(this, arguments);
						if(this.disabled) {
							Ext.Msg.alert('', 'Невозможно перейти в статус ' + this.text);
						}
					} else {
						Ext.Msg.alert('', 'Нельзя изменить статус. Запись отправляется на сервер');
					}
				}
			}
		;

		var statusButtons =  [];
		var cfg = c.tplConfig && c.tplConfig.workflow;

		if (cfg) {Ext.iterate(cfg, function (name,config) {
			statusButtons.push ({
				text: config.label,
				itemId: name,
				name: name,
				desc: config.desc,
				hideIfNot: config.hidden,
				canEnable: function (s) {return config.from && (config.from.indexOf(s) >= 0)},
				statusCls: config.cls,
				messageCls: config.messageCls || 'red'
			});
		})} else {
			statusButtons = [
			{text: 'Черновик', itemId: 'draft', name: 'draft', canEnable: function(s) { return s == 'upload'; },
				desc: 'Заказ-черновик не отправится на склад пока вы не измените его статус на "В работу"'},
			{text: 'В работу', itemId: 'upload', name: 'upload', canEnable: function(s) { return s == 'draft'; },
				desc: 'При первой же синхронизации с сервером заказ отправится в обработку.'},
			{text: 'Передача', itemId: 'processing', name: 'processing',
				desc: 'Заказ обрабатывается на сервере. Изменить его уже нельзя.'},
			{text: 'Задержан', itemId: 'onhold', name: 'onhold',
				hideIfNot: true,
				desc: 'Заказ задержан на сервере. Для разблокировки обратитесь к координатору.'},
			{text: 'Передан', itemId: 'done', name: 'done',
				desc: 'Заказ успешно передан в обработку.'}
		]};

		var btnPressed = undefined;

		statusButtons.forEach( function(b) {
			if (b.name) b.cls = 'make-' + b.name;
		});

		if(me.objectRecord.phantom || me.isNew) {
			state = me.saleOrderStatus || c.get('init');
		}

		if (me.objectRecord) Ext.each (statusButtons, function(b) {

			Ext.apply(b, btnCfg);

			b.pressed = (b.name == state);

			b.disabled = true;

			if (b.canEnable) b.disabled = !b.canEnable(state);

			if (b.hideIfNot && b.disabled) b.hidden = !b.pressed;

			if (b.pressed) {
				b.disabled = false;
				btnPressed = b;
			}
		});

		return Array({

			xtype: 'toolbar',
			itemId: 'statusToolbar',
			dock: 'top',
			ui: 'none',

			items:[{

				xtype: 'segmentedbutton',
				itemId: cName,
				items: statusButtons,
				name: cName,
				cls: 'statuses',
				serverMessage: me.objectRecord.get(cName+'Message'),

				listeners: {
					toggle: function (segBtn, btn, pressed) {
						if(pressed) {
							segBtn.up('panel').getComponent('statusDesc').update(
								Ext.applyIf(Ext.apply({},btn),segBtn)
							);
							segBtn.serverMessage = undefined;
							btn.el.addCls(btn.statusCls);
						} else {
							btn.el.removeCls(btn.statusCls);
						}
					},
					afterLayout: function (me) {
						me.fireEvent ('toggle', me, btnPressed && me.getComponent(btnPressed.name), true);
					}
				}

			}]}, {

				xtype: 'panel',
				itemId: 'statusDesc',
				cls: 'statusDesc',

				tpl: [
					'<tpl if="serverMessage">',
					'<div class="{messageCls}">{serverMessage}</div>',
					'<br></tpl>',
					'<div class="{name} {statusCls}">{desc}</div>'
				]
			}
		);

	},

	createSyncButton: function() {

		var me = this, sb = new Ext.Button ({

			iconMask: true,
			name: 'Sync',
			iconCls: 'action',
			scope: this,

			checkDisabled: function(){
				this.setDisabled(IOrders.xi.isBusy() || me.editing)
			},

			rebadge: function(){
				var me = sb,
					p = new Ext.data.SQLiteProxy({
						engine: IOrders.dbeng,
						model: 'ToUpload'
					})
				;

				p.count(new Ext.data.Operation({filters:[{property:'visibleCnt', value: 1}]}), function(o) {
					if (o.wasSuccessful())
						me.setBadge(me.cnt = o.result);
				});
			}

		});

		sb.checkDisabled();

		sb.mon (
			this,
			'saved',
			sb.rebadge,
			sb
		);

		sb.mon (
			IOrders.xi.connection,
			'beforerequest',
			sb.setDisabled,
			sb
		);
		sb.mon (
			IOrders.xi.connection,
			'requestcomplete',
			function () {
				sb.checkDisabled();
				if (sb.getBadgeText() == '!!')
					sb.setBadge(sb.cnt);
			},
			sb, {delay: 1000}
		);
		sb.mon (
			IOrders.xi.connection,
			'requestexception',
			function () {
				sb.checkDisabled();
				sb.setBadge('!!');
			},
			sb, {delay: 1000}
		);

		sb.mon( this, 'saved', function (o) {
			sb.checkDisabled();
			sb.rebadge();
		}, sb);

		return sb;
	},

	fieldSetConfig: function (me, table, modelName) {

		var columnsStore = table.columns(),
			tablesStore = Ext.getStore('tables'),
			fieldSet = createFieldSet(columnsStore, modelName, this),
			useForSelectFilters = new Ext.util.MixedCollection()
		;

		Ext.each (fieldSet.items, function(field) {

			field.cls = field.name + (field.cls ? ' ' + field.cls : '');

			if (field.xtype == 'selectfield' && field.store) {
                
                var fieldModel = tablesStore.getById(field.store.model.modelName),
                    filterByModel = columnsStore.getById(modelName+field.name).get('filterByModel'),
                    filterModel = filterByModel && tablesStore.getById(filterByModel) || fieldModel
                ;
                
				var parentColumns = filterModel.columns();

				parentColumns.each(function(parentColumn) {

					var grandParent = parentColumn.get('name'),
						id = modelName+grandParent;

					if (parentColumn.get('parent') && columnsStore.getById(id) && grandParent != field.name){
						useForSelectFilters.add(id, {
							name: grandParent,
							store: field.store,
							field: field.name,
							property: parentColumn.get('name'),
                            filterByStore: filterByModel && Ext.getStore(filterByModel)
						});
					}

				});

			}

		});

		var filterFn = function (store, property, value, filterByStore, name, callback) {
			store.clearFilter(true);
            if (filterByStore) {
                filterByStore.load({
                    filters:[{property:property,value:value}],
                    callback: function () {
                        var me = this;
                        store.filterBy(function(i){
                            return me.findExact(name, i.get('id')) >= 0; 
                        });
                        if (typeof callback == 'function') callback();
                    }
                });
            } else {
                store.filter({
                    property: property,
                    value: value,
                    callback: callback
                });
            }
		};

		useForSelectFilters.each(function (c) {

			var value = me.objectRecord.get(c.name);

			fieldSet.items.forEach(function(field) {
				if (field.name == c.name) field.listeners = {
					change: function(field, value) {
						console.log('Select value changed: ' + value);
						useForSelectFilters.each(function (c) {
							if (c.name == field.name) {
								filterFn (c.store, c.property, value, c.filterByStore, c.field, function() {
									var f = field.ownerCt.items.getByKey(c.field);
									(f && c.store.findExact('id',f.value)>=0)
										? f.setValue(f.value)
										: f.reset()
									;
								});
							}
						});
					}
				}
			});

			filterFn (c.store, c.property, value, c.filterByStore, c.field);

		});

		return fieldSet;
	}

});

Ext.reg('navigatorview', NavigatorView);
