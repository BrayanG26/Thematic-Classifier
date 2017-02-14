define([
	'dojo/_base/declare',
	'dojo/store/Memory',
	'dojo/_base/html',
	'jimu/BaseWidget',
	'dijit/form/ComboBox',
	'esri/dijit/Legend',
	'dojo/_base/array',
	'dijit/form/FilteringSelect',
	"dojo/data/ObjectStore",
	'dojo/_base/lang',
	'esri/request',
	'dojo/on',
	'dijit/registry',
	'dojo/dom-construct',
	'esri/tasks/ClassBreaksDefinition',
	'esri/tasks/AlgorithmicColorRamp',
	'esri/Color',
	'esri/tasks/GenerateRendererParameters',
	'esri/tasks/GenerateRendererTask',
	'esri/layers/LayerDrawingOptions',
	'esri/symbols/SimpleFillSymbol',
	'esri/symbols/SimpleLineSymbol',
	'esri/symbols/SimpleMarkerSymbol',
	'esri/renderers/UniqueValueRenderer',
	'dijit/form/TextBox',
	'dijit/form/Button',
	'jimu/LayerInfos/LayerInfos',
	'dojo/dom-style'],
	function (declare,
		Memory,
		html,
		BaseWidget,
		ComboBox,
		Legend,
		arrayUtils,
		FilteringSelect,
		ObjectStore,
		lang,
		esriRequest,
		on,
		registry,
		domConstruct,
		ClassBreaksDefinition,
		AlgorithmicColorRamp,
		Color,
		GenerateRendererParameters,
		GenerateRendererTask,
		LayerDrawingOptions,
		SimpleFillSymbol,
		SimpleLineSymbol,
		SimpleMarkerSymbol,
		UniqueValueRenderer,
		TextBox,
		Button,
		LayerInfos,
		domStyle) {
		//To create a widget, you need to derive from BaseWidget.
		return declare([BaseWidget], {
			// Custom widget code goes here

			baseClass: 'jimu-widget-classifier',
			//this property is set by the framework when widget is loaded.
			name: 'ThematicClassifer',
			operLayerInfos: [],
			layerItems: null,
			thematicLayerItems: null,
			subLayerItems: null,
			fieldItems: null,
			parameters: {},
			legend: null,
			defaultFrom: "#8BE636",
			defaultTo: "#EB0E49",
			txtBreaks: null,
			btnSubmit: null,
			_jimuLayerInfos: null,
			activeLayer: {},
			btnChanges: null,
			minScale: null,
			bntZoom: null,
			currentExtent: null,
			extentHandler: null,
			lighter: false,
			btnReload: null,
			flag:false,
			//methods to communication with app container:

			postCreate: function () {
				this.inherited(arguments);
				//console.log('postCreate');
			},

			startup: function () {
				this.inherited(arguments);
				this._jimuLayerInfos = LayerInfos.getInstanceSync();
				var map = this.map;
				this.initLayers();
				this._bindEvents();
			},

			onOpen: function () {
				console.log('onOpen');
			},

			onClose: function () {
				console.log('onClose');
			},
			initLayers: function () {
				console.info('initialing layers');
				this._jimuLayerInfos.traversal(lang.hitch(this, function (layerInfo) {
					if (layerInfo.id.match(/tematicas/i)) {
						if (!layerInfo.parentLayerInfo) {
							this.operLayerInfos.push(layerInfo);
						}
					}
				}));
				this.resetLayerRendererAndLegend();
				this.createLayerSelect(this.operLayerInfos);
				this.operLayerInfos = [];
				if (this.legend) {
					this.showHideLegend(false);
				}
			},
			_bindEvents: function () {
				this.own(on(this._jimuLayerInfos,
					'layerInfosIsShowInMapChanged',
					lang.hitch(this, 'refreshLayers')));

				this.own(on(this.map,
					'zoom-end',
					lang.hitch(this, 'refreshAfterZoom')));
			},

			refreshLayers: function () {
				console.info('layerInfosIsShowInMapChanged event');
				var validate = false;
				this._jimuLayerInfos.traversal(lang.hitch(this, function (layerInfo) {
					// verify if layer in renderer has been turned off
					// and layer that has been turned off before apply the render
					if (this.activeLayer.parentLayer && this.activeLayer.firstLevel && this.activeLayer.secondLevel) {
						if (this.activeLayer.parentLayer.id == layerInfo.id || this.activeLayer.firstLevel.id == layerInfo.id || this.activeLayer.secondLevel.id == layerInfo.id) {
							if (!layerInfo._visible) {
								validate = true;
								/*this.activeLayer.parentLayer = {};
								this.activeLayer.firstLevel = {};
								this.activeLayer.secondLevel = {};*/
							}
						}
					} else {
						validate = true;
					}

				}));
				if (this.btnChanges != null) {
					this.btnChanges.destroy();
					this.btnChanges = null;
				}
				this.createReloadButton(validate);
			},
			createReloadButton: function (validate) {
				if (validate) {
					console.info('Init layers...');
					this.initLayers();
				} else {
					if (this.btnReload) {
						this.btnReload.destroy();
						this.btnReload = null;
					}
					htmlF = "<button id='btnChanges' type='button'></button>";
					var node = domConstruct.toDom(htmlF);
					domConstruct.place(node, 'cambios');
					this.lighter = true;
					this._disableSelects(true);
					this.btnChanges = new Button({
						label: 'Recargar',
						onClick: lang.hitch(this, function () {
							console.info('Reloading ...');
							this.initLayers();
							this.btnChanges.destroy();
							this.btnChanges = null;
							this.lighter = false;
							this.flag = false;
						})
					}, 'btnChanges');
					this.btnChanges.startup();
					this.disableReloadButton(this.flag);
				}
				

			},
			_disableSelects: function (value) {
				/*disable all selects if all has been created*/
				var state = 'disabled';
				if (this.layerItems) {
					this.layerItems.set(state, value);
					if (this.thematicLayerItems) {
						this.thematicLayerItems.set(state, value);
						if (this.subLayerItems) {
							this.subLayerItems.set(state, value);
							if (this.fieldItems) {
								this.fieldItems.set(state, value);
								if (this.txtBreaks && this.btnSubmit) {
									this.txtBreaks.set(state, value);
									this.btnSubmit.set(state, value);
								}
								if(this.btnReload){
									this.btnReload.set(state,value);
								}
							}
						}
					}
				}
			},
			_destroyWidgets: function () {
				if (this.layerItems) {
					this.layerItems.set(state, value);
					if (this.thematicLayerItems) {
						this.thematicLayerItems.set(state, value);
						if (this.subLayerItems) {
							this.subLayerItems.set(state, value);
							if (this.fieldItems) {
								this.fieldItems.set(state, value);
								if (this.txtBreaks && this.btnSubmit) {
									this.txtBreaks.set(state, value);
									this.btnSubmit.set(state, value);
								}
							}
						}
					}
				}
			},
			disableReloadButton:function(value){
				var state = 'disabled';
				if (this.btnChanges) {
					this.btnChanges.set(state, value);
				}
			},
			refreshAfterZoom: function () {
				console.info('zoom-end');
				if (this.minScale) {
					console.warn(this.minScale);
					if (this.map.getScale() > this.minScale) {
						if (!this.lighter) {
							this._disableSelects(true);
						}
						this.disableReloadButton(true);
						console.warn('chosen layer is not visible');
					} else {
						if (!this.lighter) {
							this._disableSelects(false)
						}
						this.disableReloadButton(false);
						this.flag = true;
					}
				}
			},
			resetLayerRendererAndLegend: function () {
				/*remove current visualization from chosen layer once applied a renderer*/
				if (this.parameters.layer) {
					var optionsArray = [];
					optionsArray[this.parameters.idPos] = null;
					this.parameters.layer.setLayerDrawingOptions(optionsArray);
					this.parameters.layer.show();
					console.log('layer renderer reset successfully');
				}
			},
			createLayerSelect: function (operLayerInfos) {
				if (this.layerItems != null) {
					this.layerItems.destroy();
					this.layerItems = null;
				}
				if (this.thematicLayerItems != null) {
					this.thematicLayerItems.destroy();
					this.thematicLayerItems = null;
				}
				if (this.subLayerItems != null) {
					this.subLayerItems.destroy();
					this.subLayerItems = null;
				}
				if (this.txtBreaks != null && this.btnSubmit != null) {
					this.txtBreaks.destroy();
					this.txtBreaks = null;
					this.btnSubmit.destroy();
					this.btnSubmit = null;
				}
				if (this.fieldItems != null) {
					this.fieldItems.destroy();
					this.fieldItems = null;
				}
				var htmlF = "<div id='divTematicas'></div>";
				var node = domConstruct.toDom(htmlF);
				domConstruct.place(node, 'layer');
				var data = this.checkScaleAndVisible(operLayerInfos);
				var store = new Memory({
					data: data
				});
				this.layerItems = new FilteringSelect({
					id: 'layers',
					store: store,
					placeHolder: 'Seleccione una capa',
					style: "width: 85%; height: 30px;",
					searchAttr: "title"
				}, "divTematicas");
				this.layerItems.on('change', lang.hitch(this, this.getThematicLayers));
			},
			getThematicLayers: function () {
				if (this.thematicLayerItems != null) {
					this.thematicLayerItems.destroy();
					this.thematicLayerItems = null;
				}
				if (this.subLayerItems != null) {
					this.subLayerItems.destroy();
					this.subLayerItems = null;
				}
				if (this.txtBreaks != null && this.btnSubmit != null) {
					this.txtBreaks.destroy();
					this.txtBreaks = null;
					this.btnSubmit.destroy();
					this.btnSubmit = null;
				}
				if (this.fieldItems != null) {
					this.fieldItems.destroy();
					this.fieldItems = null;
				}
				var layer = this.layerItems.item;
				var subLayers = layer.newSubLayers;
				var htmlF = "<div id='divCapas' ></div>";
				var node = domConstruct.toDom(htmlF);
				domConstruct.place(node, 'subCapas');
				var data = this.checkScaleAndVisible(subLayers); /*getting the visible layers id*/
				this.activeLayer.parentLayer = layer;
				var store = new Memory({
					data: data
				});
				this.thematicLayerItems = new ComboBox({
					id: 'thematicLayers',
					store: store,
					placeHolder: 'Seleccione una subcapa',
					style: "width: 85%; height: 30px;",
					searchAttr: 'title'
				}, "divCapas");
				this.thematicLayerItems.startup();
				this.thematicLayerItems.on('change', lang.hitch(this, this.getSubLayers));
			},
			getLayerVisibleId: function (subLayerVisible, i) {
				console.info('into getLayerVisibleId');
				var hideIds = [];
				console.log(subLayerVisible);
				console.log(i);
				arrayUtils.forEach(subLayerVisible, function (n) {
					if (n != i) {
						hideIds.push(n);
					}
				});
				this.parameters.idHideLayers = hideIds;
			},
			getSubLayers: function () {
				if (this.subLayerItems != null) {
					this.subLayerItems.destroy();
					this.subLayerItems = null;
				}
				if (this.txtBreaks != null && this.btnSubmit != null) {
					this.txtBreaks.destroy();
					this.txtBreaks = null;
					this.btnSubmit.destroy();
					this.btnSubmit = null;
				}
				if (this.fieldItems != null) {
					this.fieldItems.destroy();
					this.fieldItems = null;
				}
				var layer = this.thematicLayerItems.item;
				var subLayers = layer.newSubLayers;
				var htmlF = "<div id='divSubCapas' ></div>";
				var node = domConstruct.toDom(htmlF);
				domConstruct.place(node, 'subCapas');
				var data = this.checkScaleAndVisible(subLayers);
				this.activeLayer.firstLevel = layer;
				var store = new Memory({
					data: data
				});
				this.subLayerItems = new ComboBox({
					id: 'subLayers',
					store: store,
					placeHolder: 'Seleccione una subcapa',
					style: "width: 85%; height: 30px;",
					searchAttr: 'title'
				}, "divSubCapas");
				this.subLayerItems.startup();
				this.subLayerItems.on('change', lang.hitch(this, this.getURL));
			},
			getURL: function () {
				if (this.txtBreaks != null && this.btnSubmit != null) {
					this.txtBreaks.destroy();
					this.txtBreaks = null;
					this.btnSubmit.destroy();
					this.btnSubmit = null;
				}
				if (this.fieldItems != null) {
					this.fieldItems.destroy();
					this.fieldItems = null;
				}
				var htmlF = "<div id='divCampos'></div>";
				var node = domConstruct.toDom(htmlF);
				domConstruct.place(node, 'campos');
				var layer = this.subLayerItems.item;
				var pos = layer.originOperLayer.mapService.subId;
				var url = layer.layerObject.url;
				this.parameters.url = url;
				this.parameters.layer = this.layerItems.item.layerObject;
				this.parameters.idPos = pos;
				this.activeLayer.secondLevel = layer;
				this.getResults(this.parameters.url);
				this.getLayerVisibleId(this.layerItems.item.layerObject.visibleLayers, pos);
				var dymanicLayerInfos = this.layerItems.item._jsapiLayerInfos;
				this._getMinScale(dymanicLayerInfos, pos);
			},
			getResults: function (url) {
				var request = esriRequest({
					url: url,
					content: {
						f: "json"
					},
					callbackParamName: "callback"
				});
				request.then(lang.hitch(this, function (resp) {
					if (resp.fields) {
						this.parameters.geometryType = resp.geometryType;
						this.getFields(resp.fields);
					}
				}), function (err) {
					console.log("failed to get field names: ", err);
				});
			},

			getFields: function (fields) {
				// filter the fields
				var filterFields = [];
				arrayUtils.forEach(fields, function (field) {
					if ((field.type === 'esriFieldTypeString' && field.domain) || (field.type === 'esriFieldTypeInteger' && field.alias.match(/identificador/i) == null) || (field.type === 'esriFieldTypeDouble' && field.name !== 'shape.STLength()')) {
						filterFields.push(field);
					}
				});
				var store = new Memory({
					data: filterFields
				});
				if (this.fieldItems) {
					this.fieldItems.set('store', store);
				} else {
					this.fieldItems = new ComboBox({
						id: 'fields',
						store: store,
						placeHolder: 'Seleccione un campo',
						style: "width: 85%; height: 30px;",
						searchAttr: 'alias'
					}, 'divCampos');
				}
				this.fieldItems.startup();
				this.fieldItems.on('change', lang.hitch(this, this.setParameters));
			},
			checkScaleAndVisible: function (layer) {
				var vSubLayers = [];
				arrayUtils.forEach(layer, function (l) {
					if (l._visible) {
						vSubLayers.push(l);
						/*if (l.isInScale()) {
	
						}*/
					}
				});
				return vSubLayers;
			},
			_getMinScale: function (dynamicLayerInfos, id) {
				arrayUtils.forEach(dynamicLayerInfos, lang.hitch(this, function (obj) {
					if (obj.id == id) {
						this.minScale = obj.minScale;
					}
				}));

			},
			setParameters: function (value) {
				if (this.txtBreaks != null && this.btnSubmit != null) {
					this.txtBreaks.destroy();
					this.txtBreaks = null;
					this.btnSubmit.destroy();
					this.btnSubmit = null;
				}
				if (this.fieldItems.item.domain) {
					this.parameters.isDomain = true;
					this.parameters.domainObject = this.fieldItems.item.domain;
				} else {
					this.parameters.isDomain = false;
				}
				this.parameters.field = this.fieldItems.item.name;
				this.chooseRender();
			},
			chooseRender: function () {
				if (this.parameters.isDomain) {
					this.uniqueValRender();
				} else {
					if (this.txtBreaks == null && this.btnSubmit == null) {
						var htmlF = "<input id='txtBreaks' class='col-1-3'></input>";
						var node = domConstruct.toDom(htmlF);
						domConstruct.place(node, 'datos');
						this.txtBreaks = new TextBox({
							id: 'classes',
							value: '',
							placeHolder: 'Ingrese numero de intervalos'
						}, 'txtBreaks');
						this.txtBreaks.startup();
						htmlF = "<button id='btnSubmit' type='button' class='col-1-3'></button>";
						node = domConstruct.toDom(htmlF);
						domConstruct.place(node, 'datos');
						this.btnSubmit = new Button({
							id: 'submit',
							label: 'OK',
							onClick: lang.hitch(this, function () {
								var breakCount = this.txtBreaks.get('value');
								if (!(/\D/.test(breakCount))) {
									this.classBreaks(this.defaultFrom, this.defaultTo, breakCount);
								} else {
									this.txtBreaks.set('value', '');
									this.txtBreaks.focus();
								}
							})
						}, 'btnSubmit');
						this.btnSubmit.startup();
					}
				}
			},
			classBreaks: function (c1, c2, breakCount) {
				var classDef = new ClassBreaksDefinition();
				classDef.classificationField = this.parameters.field;
				classDef.classificationMethod = "natural-breaks"; // always natural breaks
				classDef.breakCount = breakCount; // always five classes

				var colorRamp = new AlgorithmicColorRamp();
				colorRamp.fromColor = new Color.fromHex(c1);
				colorRamp.toColor = new Color.fromHex(c2);
				colorRamp.algorithm = "cie-lab"; // options are:  "cie-lab", "hsv", "lab-lch"

				// symbol goes here
				classDef.baseSymbol = this.createSymbol();
				classDef.colorRamp = colorRamp;

				var params = new GenerateRendererParameters();
				params.classificationDefinition = classDef;
				var generateRenderer = new GenerateRendererTask(this.parameters.url);
				generateRenderer.execute(params, lang.hitch(this, this.applyRenderer), this.errorHandler);
			},
			applyRenderer: function (renderer) {
				// dynamic layer stuff
				var optionsArray = [];
				var drawingOptions = new LayerDrawingOptions();
				drawingOptions.renderer = renderer;
				// set the drawing options for the relevant layer
				// optionsArray index corresponds to layer index in the map service
				optionsArray[this.parameters.idPos] = drawingOptions;
				this.parameters.layer.setLayerDrawingOptions(optionsArray);
				this.parameters.layer.show();
				this.createLegend();
			},
			createLegend: function () {
				var hideLayers = this.parameters.idHideLayers;
				var layer = this.parameters.layer;
				var title = this.parameters.layer.title;
				if (!this.legend) {
					htmlF = "<div id='legendDiv' ></div>";
					var node = domConstruct.toDom(htmlF);
					domConstruct.place(node, 'legendField');
					this.legend = new Legend({
						id: 'legend',
						map: this.map,
						layerInfos: [{
							hideLayers: hideLayers,
							layer: layer,
							title: title
						}
						]
					}, 'legendDiv');
					this.legend.startup();
				} else {
					this.legend.refresh([{
						hideLayers: hideLayers,
						layer: layer,
						title: title
					}]);
				}
				this.createReestablishButton();
				this.showHideLegend(true);
			},
			createReestablishButton: function () {
				if (!this.btnReload) {
					htmlF = "<button id='btnReload' type='button' class='col-1-3'></button>";
					var node = domConstruct.toDom(htmlF);
					domConstruct.place(node, 'datos');
					this.btnReload = new Button({
						label: 'Reestablecer',
						onClick: lang.hitch(this, function () {
							console.info('Reloading ...');
							this.initLayers();
							this.btnReload.destroy();
							this.btnReload = null;
						})
					}, 'btnReload');
					this.btnReload.startup();
				} else {
					this.btnReload.destroy();
					this.btnReload = null;
					this.createReestablishButton();
				}
			},
			errorHandler: function (err) {
				console.log("error: ", JSON.stringify(err));
			},
			showHideLegend: function (value) {
				/*switch between display or not of legend*/
				if (value) {
					var node = registry.byId('legend').domNode;
					domStyle.set(node, 'display', 'block');
				} else {
					var node = registry.byId('legend').domNode;
					domStyle.set(node, 'display', 'none');
				}
			},
			uniqueValRender: function () {
				var randomColor;
				console.info(this.parameters.field);
				var renderer = new UniqueValueRenderer(this.createSymbol(), this.parameters.field);
				var codedValues = this.parameters.domainObject.codedValues;
				var color;
				for (var i = 0; i < codedValues.length; i++) {
					randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
					color = new Color(randomColor);
					var symbol = this.createSymbol();
					renderer.addValue({
						value: codedValues[i].code,
						symbol: symbol.setColor(color),
						label: codedValues[i].name,
						description: ''
					});
				}
				var optionsArray = [];
				var drawingOptions = new LayerDrawingOptions();
				drawingOptions.renderer = renderer;
				// set the drawing options for the relevant layer
				// optionsArray index corresponds to layer index in the map service
				optionsArray[this.parameters.idPos] = drawingOptions;
				this.parameters.layer.setLayerDrawingOptions(optionsArray);
				this.parameters.layer.show();
				this.createLegend();
			},
			createSymbol: function () {
				/*create default symbol for render depending chosen layer*/
				if (this.parameters.geometryType == 'esriGeometryPolyline') {
					return new SimpleLineSymbol(
						SimpleLineSymbol.STYLE_SOLID,
						new Color([0, 0, 0]),
						5);
				}
				if (this.parameters.geometryType == 'esriGeometryPoint') {
					var marker = new SimpleMarkerSymbol();
					marker.setStyle(SimpleMarkerSymbol.STYLE_SQUARE);
					marker.setOffset(0, 0);
					marker.setColor(new Color([0, 0, 0, 1]));
					marker.setSize(10);
					return marker;
				}
				if (this.parameters.geometryType == 'esriGeometryPolygon') {
					return new SimpleFillSymbol("solid", null, null);
				}
			}
		});
	});