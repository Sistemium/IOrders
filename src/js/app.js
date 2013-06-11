var DEBUG = localStorage.getItem('DEBUG');

if(DEBUG == null)
	DEBUG = (location.protocol == 'https:' ? false : true);
else
	DEBUG = (DEBUG == 'true')
;

var oldConsoLog = console.log;

if (!DEBUG) {
	console.log = Ext.emptyFn;
};

applicationCache.addEventListener('updateready', function(a) {
	
	window.applicationCache.update();
	
	Ext.Msg.confirm(
		'Обновление программы',
		'<p>Получена новая версия, необходимо перезапустить программу.</p>' +
		'<p>Можно перезапуститься ?</p>',
		function (yn) {
			if (yn == 'yes'){
				location.reload();
			}
		}
	);
	
});


Ext.regApplication({
	name: 'IOrders',
    icon: 'src/css/apple-touch-icon.png',

//    phoneStartupScreen: 'phone_startup.png',
	
	init: function() {
		
		IOrders.newDesign = localStorage.getItem('newDesign') == 'true' ? true : false;
		
		var store = Ext.getStore('tables');
		
		createModels(store);
		createStores(store, { pageSize: 400 });
		
		IOrders.mainMenuRecord = Ext.ModelMgr.create({id: localStorage.getItem('login')}, 'MainMenu');
		
		this.viewport.setActiveItem(Ext.create({
			xtype: 'navigatorview',
			layout: 'fit',
			isObjectView: true,
			objectRecord: IOrders.mainMenuRecord
		}));
		
		this.viewport.getActiveItem().loadData();
	},
	
	launch: function() {
		
		var tStore = Ext.getStore('tables'),
			metadata = Ext.decode(localStorage.getItem('metadata')),
			vp = this.viewport = Ext.create({xtype: 'viewport'});
		;
		
		this.dbeng = new Ext.data.Engine({
			listeners: {
				dbstart: function(db) {
					console.log('Database started: version=' + db.version);
					
					var toUploadConfig = {
						fields: ['table_name', 'id', 'cnt', 'ts', 'pid', 'cs', {name: 'hasPhantom', type: 'boolean'}]
					}
					
					if (db.supports.entity)
						toUploadConfig.fields.push('visibleCnt')
					;
					
					Ext.regModel('ToUpload', toUploadConfig);
					
					tStore.getProxy().data = this.metadata;
					tStore.load(function() {IOrders.init();});
					
					if (tStore.getById('Geolocation')) IOrders.geoTrack();
					
					IOrders.logEvent({
						module: 'app',
						action: 'dbstart',
						data: 'dbversion:'+db.version
					});
					
					if (DEBUG == 'eventlog') window.onerror = function(msg, url, line) {
						
						console.log ('UnhandledException: ' + msg + ' at line ' + line);
						
						var part = '/js/',
							modulePos = url.lastIndexOf(part),
							module = url,
							viewTitle
						;
						
						if (IOrders.viewport) {
							var ai = IOrders.viewport.getActiveItem();
							
							if (ai && ai.dockedItems) {
								var tb = ai.dockedItems.getAt(0);
								viewTitle = tb.title;
							}
						}
						
						if (modulePos < 0)
							modulePos = url.lastIndexOf(part = '/')
						;
						
						if (modulePos > 0)
							module = url.slice(modulePos + part.length)
						;
						
						IOrders.logEvent({
							module: module,
							action: 'UnhandledException' ,
							data: 'title: ' + viewTitle + ' '
								+ msg + ' at line ' + line
						});
						
						return false;
						
					}
					
				},
				fail: function() {
					localStorage.clear();
					location.reload();
				}
			}
		});
		
		IOrders.xi = new Ext.data.XmlInterface({
			view: 'iorders',
			noServer: !location.protocol == 'https:' || localStorage.getItem('realServer') == 'false'
		});
		
		IOrders.getMetadata = {
			success: function() {
				var me=this;
				
				me.request({
					command: 'metadata',
					success: function(response) {
						var m = response.responseXML;
						
						IOrders.viewport.setLoading(false);
						
						console.log(m);
						
						var metadata = me.xml2obj(m).metadata;
						
						localStorage.setItem('metadata', Ext.encode(metadata));
						
						IOrders.dbeng.startDatabase(metadata);
						
					}
				});
			}
		};
		
		if(!metadata) {
			
			this.viewport.setActiveItem(Ext.create({
				xtype: 'form',
				name: 'Login',
				ownSubmit: true,
				items: [
					{xtype: 'fieldset', 
						items: [
					    	{
								xtype: 'textfield',
								id: 'login', name: 'login', label: 'Логин',
								autoCorrect: false, autoCapitalize: false,
								value: 'demo'
							},
					    	{
								xtype: 'passwordfield',
								id: 'password', name: 'password', label: 'Пароль'
							}
						]
					},
					{xtype: 'button', text: 'Логин', name: 'Login'}
				]
			}));
			
		} else {
			
			Ext.dispatch({controller: 'Navigator', action: 'afterAppLaunch'});
			
			Ext.apply (this.xi, {
				username: localStorage.getItem('login'),
				password: localStorage.getItem('password')
			});
			
			var r = function(db) {
				IOrders.xi.login ({
					success: function() {
						if (db.clean || localStorage.getItem('needSync') == 'true'){
							localStorage.removeItem('needSync');
							IOrders.xi.download(IOrders.dbeng);
						} else {
							p = new Ext.data.SQLiteProxy({engine: IOrders.dbeng, model: 'ToUpload'});
							
							p.count(new Ext.data.Operation(),
								function(o) {
									if (o.result == 0)
										Ext.dispatch ({controller: 'Main', action: 'onXiMetaButtonTap', silent: true});
									else
										console.log ('There are unuploaded data');
								}
							);
						}
					}
				});
			}, f = function() {
				IOrders.xi.reconnect({
					success: function() {
						p = new Ext.data.SQLiteProxy({engine: IOrders.dbeng, model: 'ToUpload'});
						
						Ext.Msg.confirm ('Не удалось обновить БД', 'Проверим метаданные?', function (b) {
							if (b == 'yes')
								IOrders.xi.request( {
									command: 'logoff',
									success: function() {
										this.sessionData.id = false;
										this.login({
											success: function() {
												Ext.dispatch ({controller: 'Main', action: 'onXiMetaButtonTap'});
											}
										});
									}
								})
						});
					}
			});};
			
			
			this.dbeng.on ('dbstart', r);
			this.dbeng.on ('upgradefail', f);
			
			this.dbeng.startDatabase(metadata);
		};
		
	},
	
	
	geoTrack: function() {
		if (Ext.ModelMgr.getModel('Geolocation')) {
			
			var count = 0,
				getLocation = function () {
					if ( ++count > 6 )
						IOrders.lastCoords && saveLocation();
					else navigator.geolocation.getCurrentPosition (
						function(l) {
							
							console.log ('Geolocation success at step ' + count + ': acc=' + l.coords.accuracy);
							
							IOrders.lastCoords = l.coords;
							
							if(l.coords.accuracy < 10)
								saveLocation();
							else
								getLocation()
							;
							
						},
						function(error) {
							
							console.log( 'Geolocation error at step ' + count + ': ' + error.message + ', code: ' + error.code );
							
							if( error.code === 1 )
								Ext.Msg.alert('Геолокация запрещена',
									'iOrders нормально работать не будет. <br/><br/>'
										+ 'Зайдите в "Настройки"->"Основные"->"Сброс", нажмите "Сбросить предупр. размещения". '
										+ '<br/><br/> Затем, разрешите отслеживание местоположения.',
									function(btn) {
										count = 0;
										Ext.defer( getLocation, 2000 );
									}
								);
							else{
								if (IOrders.lastCoords) IOrders.lastCoords.errorCode = error.code;
								getLocation();
							}
						},
						{ enableHighAccuracy: true, timeout: 30000 }
					);
				},
				saveLocation = function () {
					count = 0;
					Ext.ModelMgr.create( Ext.apply( {},  IOrders.lastCoords ), 'Geolocation' ).save();
					IOrders.geoWatch = window.setTimeout( getLocation, 1000 * 60 * 5 );
				}
			;
			
			Ext.defer( getLocation, 15000 );
			
		};
	},
	
	logEvent: function (eventData){
		var model = Ext.ModelMgr.getModel('Eventlog');
		
		if (!DEBUG && model) {
			Ext.ModelMgr.create( eventData, model ).save();
		}
		
	}
	
});