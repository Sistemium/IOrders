var createModels = function(tablesStore) {

	tablesStore.each(function(table) {
		
		var fields = [], validations = [], tableName = table.getId(),
			config = {
				fields: fields,
				modelName: tableName,
				proxy: {
					type: 'sql',
					engine: IOrders.dbeng
				},
				validations: validations
			},
			inits = [],
			applyTpl = function (target, source) {
				Ext.apply (target, {
						tpl: source.get('template'),
						tplConfig: source.get('templateConfig')
					}
				);
				
				try {
					if (target.tplConfig && target.tplConfig.length)
						target.tplConfig = JSON.parse (target.tplConfig)
					;
				} catch (e) {
					console.log (e);
					console.log (target.tplConfig);
					target.tplConfig = undefined;
				}
			}
		;
		
		table.columns().each(function(column) {
			
			var cName = column.get('name'),
				fieldConfig = {
					name: cName,
					type: column.get('type'),
					useNull: true,
					defaultValue: column.get('init'),
					template: column.get('template'),
					compute: column.get('compute'),
				}
			;
			
			if (String.right(cName, 3) == 'ing')
				fieldConfig.defaultValue = 'draft';
			
			(column.get('parent') || cName == 'date') && column.get('label')
				&& validations.push({
					type: 'length', field: cName, min: 1,
					message: 'Поле "' + column.get('label') + '" обязательно нужно заполнить'
				})
			;
			
			cName == 'deviceCts'
				&& inits.push({
					name: cName,
					fn: function () {
						return this.data[cName] || new Date().format('Y-m-d H:i:s')
					}
				})
			;
			
			var compute = column.get('compute');
			
			if (compute) {
				config[cName] = function () {
					return eval(compute);
				};
				inits.push({
					fn: config[cName],
					name: cName
				});
			}
			
			applyTpl (column, column);
			
			fields.push(fieldConfig);
			
		});
		
		inits.length && (
			config.init = function () {
				Ext.each(inits, function (i) {
					this.data[i.name] = i.fn.call (this);
				}, this)
			}
		);
		
		var model = Ext.regModel(tableName, config);
		
		applyTpl (model, table);
		
		regStore(tableName);
	});

	afterCreateModels();
};

function overrideModelIfExists (modelName, overrideWith) {
	
	var model;
	
	(model = Ext.ModelMgr.getModel(modelName)) && Ext.override(model, overrideWith);
	
}


function afterCreateModels() {
	
	overrideModelIfExists('Customer', {
		getCustomerBonusProgram: function(callback) {
			
			var store = createStore('CustomerBonusProgram', {
				filters: [{property: 'customer', value: this.getId()}]
			});
			
			store.load({
				limit: 0,
				callback: function() {
					callback && callback.call(this, store);
				},
				scope: this 
			});
		}
	});
	
	overrideModelIfExists( 'Shipment', {
		name: function() {
			return this.get('ndoc')
				+ ' для ' + this.get('Customer_name')
				+ ' от ' + this.get('date').dateFormat('d/m/Y')
				+ ' на ' + this.get('totalCost') + ' руб.'
		}
	});
	
	overrideModelIfExists('SaleOrder', {
		
		name: function() {
			var dt = this.get('date');
			return this.get('Customer_name')
				+ (dt ? (' от ' + dt.dateFormat('d/m/Y')) : '')
				+ ' на ' + this.get('totalCost') + ' руб.'
			;
		},
		
		getDateDefault: function(today) {
			
			!today && (today = new Date());
			
			var todayWeekDay = today.getDay(),
				addDays = todayWeekDay >= 6 && todayWeekDay <= 6 ? 7 + 1 - todayWeekDay : 1
			;
			return today.add(Date.DAY, addDays);
		},
		
		getProcessingName: function() {
			
			switch (this.get('processing')) {
				case 'draft':
					return 'Черновик';
				case 'upload':
					return 'В работу';
				case 'processing':
					return 'Проверка';
				case 'done':
					return 'На складе';
			}
			
			return null;
		}
		
	});
	
	overrideModelIfExists('Uncashment', {
		name: function() {
			return this.get('totalSumm') + ' руб. ' + this.get('datetime');
		}
	});
	
	overrideModelIfExists('SalesSchema', {
		
		ratioVolumes: function(data, ratio1, ratio0) {
			var result=Ext.apply({},data);
			
			if (result.volumeCombo>=0) {
				result.volume1 = Math.ceil (result.volumeCombo * ratio1 / (ratio1+ratio0));
				result.volume0 = result.volumeCombo - result.volume1;
			}
			
			return result;
		},
		
		fixedVolumes: function(data, ratio1, ratio0) {
			var result=Ext.apply({},data);
			
			if (result.volumeCombo>=0) {
				if (ratio0) {
					result.volume0 = result.volumeCombo ? ratio0 : 0;
					result.volume1 = result.volumeCombo - result.volume0;
				}
				if (ratio1) {
					result.volume1 = result.volumeCombo ? ratio1 : 0;
					result.volume0 = result.volumeCombo - result.volume1;
				}
			}
			
			return result;
		}
		
	});
	
};

function continueLoad (store,r,s){
	if (s) {
		//console.log ('Store '+store.storeId+' load success: '+r.length);
		
		if (r.length >= store.pageSize) {
			store.currentPage++;
			store.load({
				page : store.currentPage,
				start: (store.currentPage - 1) * this.pageSize,
				limit: this.pageSize,
				addRecords: true
			});
		}
	}
	else
		console.log ('Store '+store.storeId+' load failure');
}


var createStores = function(tablesStore, config) {
	
	tablesStore.each(function(table) {
		if (!(table.get('type') == 'view') && table.columns().data.map[table.getId() + 'name'] && table.deps().data.length) {
			regStore(table.getId(), Ext.apply({
				autoLoad: true,
				pageSize: 0,
				listeners: {
					load: continueLoad
				}
			}, Ext.apply(getSortersConfig(table.getId(), {}), config)));
		}
	});
	
};

var regStore = function(name, config) {
	
	Ext.regStore(name, Ext.apply({
		model: name,
		autoDestroy: false,
		remoteFilter: true,
		remoteSort: true, 
		proxy: {
			type: 'sql',
			engine: IOrders.dbeng
		}
	}, config));
	
};

var createStore = function(name, config) {

	return new Ext.data.Store(
		Ext.apply({
			remoteFilter: true,
			remoteSort: true,
			clearOnPageLoad: false,
			pageSize: 70,
			model: name,
			proxy: {
				type: 'sql',
				engine: IOrders.dbeng
			}
		}, config)
	);
};