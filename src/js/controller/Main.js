Ext.regController('Main', {
	
	onButtonTap: function(options) {
		
		var view = options.view,
			redirectTo = this,
			btn = options.btn,
			btnName = btn.name ? btn.name : btn.itemId,
			action = options.action.replace('Button', btnName + 'Button')
			;
		
		if ( view.isXType('navigatorview') || view.isXType('encashmentview') || view.isXType('uncashmentview')) {
			redirectTo = 'Navigator';
		} else if ( view.isXType('saleorderview') ) {
			redirectTo = 'SaleOrder';
		} else {
			var sb = view.up('segmentedbutton');
			if (sb && sb.name) {
				redirectTo = 'Navigator';
				action = 'onStatusButtonTap';
				if (options.btn.wasPressed) action = false;
			}
		}

		if(btn.el.hasCls('disable')) {
			
			var msg = unavailBtnFuncMessage(btn, view);
			Ext.Msg.show({
	            title : msg.problem,
	            msg   : msg.reason + ' '+ msg.howFix,
	            buttons: Ext.MessageBox.OK,
	            icon  : Ext.MessageBox.INFO
			});
			return;
		}

		var controller = Ext.ControllerManager.get(redirectTo) || redirectTo;

		// console.info('onButtonTap:', redirectTo, action);
		if (action && controller && controller[action]) Ext.dispatch(Ext.apply(options, {
			controller: redirectTo,
			action: action
		}));
		
	},

	onLoginButtonTap: function(options) {

		options.btn.up('form').submit();
	},

	onCacheRefreshButtonTap: function(options) {
		var queue = function() {
			Ext.Msg.alert('refresh end');
		};
		
		Ext.StoreMgr.each( function(store) {
			if (store.autoLoad) {
				queue = Ext.util.Functions.createDelegate(store.load, store, [{
					callback: queue
				}]);
				store.currentPage = 1;
			}
		});
		
		queue();
	},

	onListItemTap: function(options) {
		
		var list = options.list,
			rec = options.list.getRecord(options.item),
		    navView = list.up('navigatorview'),
		    saleOrderView = list.up('saleorderview'),
		    listEl = list.getEl()
		;
		
		if(navView) {
			switch(rec.get('id')) {
				case 'SaleOrderPosition' : {
					
					var target = Ext.get(options.event.target);
					
					if(target.hasCls('x-button')) {
						
						if(target.hasCls('extend')) {
							var form = navView.form;
							var formRec = form.getRecord();
							
							form.updateRecord(formRec);
							
							var errors = formRec.validate();
							if(errors.isValid()) {
								
								var statusBar = form.getComponent('statusToolbar'),
									state = undefined
								;
									
								if(statusBar) {
									
									var segBtn = statusBar.getComponent('processing');
									
									segBtn.items.each(function(b) {
										if(b.pressed) {
											state = b.name;
											return false;
										}
										return true;
									});
									
								}
								
								formRec.save({success: function() {
									
									var tableRec = Ext.getStore('tables').getById(formRec.modelName);
									
									loadDepData(tableRec, tableRec, undefined, undefined, true);
									Ext.dispatch(Ext.apply(options, {
										controller: 'SaleOrder',
										saleOrder: navView.objectRecord,
										saleOrderStatus: state,
										isNew: navView.isNew
									}));
									
									
								}});
							} else {
								var msg = '';
								errors.each(function(err) {
									msg += err.message + '<br/>';
								});
								Ext.Msg.alert('Некорректные данные', msg, Ext.emptyFn);
							}
						}
						
					} else {
						
						Ext.dispatch(Ext.apply(options, {
							controller: 'Navigator',
							isSetView: listEl.hasCls('x-deps-list')
						}));
						
					}
					break;
				}
				default : {
					Ext.dispatch(Ext.apply(options, {
						controller: 'Navigator',
						isSetView: listEl.hasCls('x-deps-list')
					}));
				}
			};
		} else if(saleOrderView) {
			Ext.dispatch(Ext.apply(options, {controller: 'SaleOrder'}));
		}
	},
	
	onListItemDisclosure: function(options) {

		var list = options.list,
	    	navView = list.up('navigatorview'),
	    	listEl = list.getEl(),
	    	tappedRec = list.getRecord(options.item)
		;
	
		if(navView) {

			var tableStore = Ext.getStore('tables'),
				table = tableStore.getById(tappedRec.modelName),
				depStore = table.deps()
			;

			Ext.dispatch(Ext.apply(options, {
				controller: 'Navigator',
				action: 'createAndActivateView',
				isSetView: listEl.hasCls('x-deps-list'),
				editable: false,
				filterBy: table.get('id')
			}));
		}
	},
	
	onListItemSwipe: function(options) {
		
		var list = options.list;
		var listEl = list.getEl();
		
		if(listEl.hasCls('x-product-list')) {
			Ext.dispatch(Ext.apply(options, {controller: 'SaleOrder'}));
		}
	},

	onDatePickerTap: function(options) {

		var datePicker = new Ext.ux.DatePicker({
            floating: true, hidden: true, width: 300,
            dateField: options.dateField,
            listeners: {
                change: function(dp, date) {
                	dp.dateField.setValue(date.format('d.m.Y')); 
                }
            }
        });
        datePicker.showBy(options.img);
        datePicker.setValue(new Date().add(Date.DAY, 1));
	},

	onFieldLabelTap: function(options) {

		var field = options.field;
		var navView = field.up('navigatorview');
		if(navView) {
			Ext.dispatch(Ext.apply(options, {controller: 'Navigator', action: options.action.replace('Field', 'selectfield'), view: navView}));
		}
	},

	onFieldInputTap: function(options) {

		var field = options.field;
		var navView = field.up('navigatorview');
		if(navView) {
			Ext.dispatch(Ext.apply(options, {controller: 'Navigator', action: options.action.replace('Field', field.xtype), view: navView}));
		}
	},

	onSelectFieldValueChange: function(options) {

		var field = options.field;
		var navView = field.up('navigatorview');
		var encashView = field.up('encashmentview');
		
		if(navView && field.xtype == 'filterfield') {
			Ext.dispatch(Ext.apply(options, {controller: 'Navigator', action: options.action.replace('SelectField', 'Filter'), view: navView}));
		} else if(encashView && field.name === 'customer') {
			Ext.dispatch(Ext.apply(options, {controller: 'Navigator', action: options.action.replace('SelectField', 'EncashCustomer'), view: encashView}));
		} else if(field.name === 'id') {
			Ext.dispatch(Ext.apply(options, {controller: 'Navigator', action: options.action.replace('SelectField', 'NameSelectField'), view: navView}));
		}
	},

	onBeforeSubmitForm: function(options) {

		Ext.dispatch(Ext.apply(options, {action: options.action.replace('Form', options.form.name + 'Form')}));
	},

	onBeforeSubmitLoginForm: function(options) {

		var formData = options.values;
		var login = formData.login;
		var password = formData.password;
		
		if(login && password) {
			
			IOrders.setItemPersistant('login', login);
			IOrders.setItemPersistant('password', password);
			
			IOrders.xi.username = login;
			IOrders.xi.password = password;
			
			IOrders.viewport.setLoading('Проверяю пароль');
			
			IOrders.xi.reconnect(IOrders.getMetadata);
		} else {
			Ext.Msg.alert('Авторизация', 'Введите логин и пароль');
		}
	},
	
	prefsCb : {
		success: function(r,o) {
			Ext.Msg.alert(o.command, 'Получилось');
		},
		failure: function(r,o) {
			var msg = 'Не получилось: ';
			r.responseText && (msg += r.responseText);
			r.exception && (msg += r.exception);
			Ext.Msg.alert(o.command, msg);
		}
	},
	
	onXiDownloadButtonTap: function(options) {
		IOrders.xi.download ( IOrders.dbeng );
	},

	onXiLoginButtonTap: function(options) {
		IOrders.xi.login ( this.prefsCb );
	},

	onXiLogoffButtonTap: function(options) {
		IOrders.xi.request ( Ext.apply ({
				command: 'logoff'
			},
			this.prefsCb
		));
	},

	onPrefsCloseButtonTap: function(options) {
		options.btn.up('actionsheet').hide();
	},

	onXiMetaButtonTap: function(options) {
		IOrders.xi.request( Ext.applyIf ({
			command: 'metadata',
			success: function(response) {
				var m = response.responseXML;
				
				console.log(m);
				
				var metadata = this.xml2obj(m).metadata;
				
				metadata.name = IOrders.dbName(metadata);
				
				if ( metadata.version > IOrders.dbeng.db.version )
					Ext.Msg.confirm(
						'Требуется пересоздать БД',
						'Текущая версия: '+IOrders.dbeng.db.version + '<br/>' +
						'Новая версия: '+metadata.version + '<br/><br/>' +
						'Стереть все данные и загрузить то, что лежит на сервере?',
						function (yn) {
							if (yn == 'yes'){
								IOrders.setItemPersistant('metadata', Ext.encode(metadata));				
								location.reload();
							}
						}
					);
				else if (!options.silent) {
					IOrders.setItemPersistant('metadata', Ext.encode(metadata));
					Ext.Msg.alert('Метаданные в норме', 'Версия: ' + metadata.version);
				}
				
			}},
			this.prefsCb
		));
	},

	onClearLocalStorageButtonTap: function(options) {
		Ext.Msg.confirm('Внимание', 'Действительно нужно все стереть?', function(yn){
			if (yn == 'yes'){
				IOrders.clearLocalStorage();
				Ext.defer (function() {
					Ext.Msg.alert('Все стерто', 'Необходим перезапуск', function() {
						location.reload();
					});
				}, 500);
			}
		});
	},

	onDbRebuildButtonTap: function(options) {
		
		var p = new Ext.data.SQLiteProxy({
				engine: IOrders.dbeng,
				model: 'ToUpload'
			})
		;
		
		p.count(new Ext.data.Operation({filters:[{property:'visibleCnt', value: 1}]}), function(o) {
			
			if (o.wasSuccessful()) {
				
				if (o.result) Ext.Msg.alert(
					'Несохраненные данные',
					'Для пересоздания БД требуется удалить их или передать на сервер'
				);
				
				else Ext.Msg.confirm(
					'Внимание',
					'Действительно нужно все стереть и загрузить обновленное с сервера ?',
					function(yn) { if (yn == 'yes') Ext.dispatch (Ext.apply(
						options,
						{action: 'dbRebuild'}
					))}
				);
			
			}
		});
		
	},
	
	dbRebuild: function () {
		
		IOrders.viewport.setLoading('Обновляю базу данных ...');
		
		IOrders.xi.request({
			
			command: 'metadata',
			noRetry: true,
			
			success: function(response) {
				var m = response.responseXML;
				
				console.log(m);
				
				var metadata = this.xml2obj(m).metadata;
				
				if (metadata.version) {
					metadata.name = IOrders.dbName(metadata);
					IOrders.setItemPersistant('metadata', Ext.encode(metadata));
				} else {
					metadata = Ext.decode(IOrders.getItemPersistant('metadata'))
				}
				
				IOrders.dbeng.clearListeners();
				
				IOrders.dbeng.on ('dbstart', function() {
					IOrders.setItemPersistant ('needSync', true);
					location.replace(location.origin + location.pathname);
				});
				
				IOrders.dbeng.startDatabase (metadata, true);
			},
			
			failure: function(r,o) {
				
				if (r.status == 401) {
					IOrders.xi.login({
						success: function () {
							Ext.dispatch ({
								controller: 'Main',
								action: 'dbRebuild'
							});
						}
					});
				}
				
				IOrders.viewport.setLoading (false);
				
				return false;
			}
			
		});
		
	},

	onReloadButtonTap: function(options) {
		location.reload();
	},

	onHeartbeatOnButtonTap: function(options) {
		if (!window.xmlhttp) {
		  window.xmlhttp = new XMLHttpRequest();
		  window.xmlhttp.onreadystatechange = function() {
			if (xmlhttp.readyState == 4) {
			   if(xmlhttp.status == 200) {
				var url = location.href+'?username='+IOrders.xi.username+'&ts='+new Date().format('YmdHis');
				window.xmlhttp.open ('GET', url, true);
				window.nextHeartBeat = setTimeout (function() { window.xmlhttp.send(null) }, 10000);
			   }
			}
		  };
		}
		var url = location.href+'?username='+IOrders.xi.username+'&ts='+new Date().format('YmdHis');
		window.xmlhttp.open ('GET', url, true);
		window.xmlhttp.send(null) ;
	},
	
	onXiNoServerButtonTap: function(options) {
		IOrders.xi.noServer = true;
		IOrders.setItemPersistant('realServer', false);
	},

	onXiYesServerButtonTap: function(options) {
		IOrders.xi.noServer = false;
		IOrders.setItemPersistant('realServer', true);
	},

	onEnableLogButtonTap: function(options) {
		DEBUG = true;
		localStorage.setItem('DEBUG', true);
	},

	onDisableLogButtonTap: function(options) {
		DEBUG = false;
		localStorage.setItem('DEBUG', false);
	},

	onNewDesignButtonTap: function(options) {
		IOrders.newDesign = true;
		IOrders.setItemPersistant('newDesign', true);
	},

	onOldDesignButtonTap: function(options) {
		IOrders.newDesign = false;
		IOrders.setItemPersistant('newDesign', false);
	},

	onApplyPatchButtonTap: function(options) {
		
		var me = IOrders.dbeng;
		
		me.db.transaction ( function(t) {
			
			t.debug = true;
			
			me.executeDDL (t, 'DROP view IF EXISTS ToUpload');
			
			me.executeDDL (t, 'create view ToUpload as select '
				+ 'table_name, row_id id, count(*) cnt, min (ts) ts, max(wasPhantom) hasPhantom, max(p.id) pid, max(cs) cs'
				+ ' from Phantom p where p.cs is null group by p.row_id, p.table_name'
			);
			
			me.executeDDL (t, 'create trigger commitUpload instead of update on ToUpload begin '
				+ 'delete from Phantom where row_id = new.id and id <= new.pid; '
				+ 'end'
			);
			
		}, function() { console.log ('Patch fail') }, function() { console.log ('Patch success') } )
		
	},

	onListSelectionChange: function(options) {
		
		var navView = options.list.up('navigatorview');
		
		if(navView) {
			Ext.dispatch(Ext.apply(options, {controller: 'Navigator', view: navView}));
		}
		
	}
	
});