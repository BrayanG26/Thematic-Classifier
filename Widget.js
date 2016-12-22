define([
	'dojo/_base/declare',
	'dojo/store/Memory',
	'dojo/_base/html',
	'jimu/BaseWidget',
	'dijit/form/ComboBox',
	'esri/dijit/Legend',
	'dojo/_base/array',
	"dijit/form/FilteringSelect",
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
	'dijit/form/Button'],
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
		Button) {
		//To create a widget, you need to derive from BaseWidget.
		return declare([BaseWidget], {
			// Custom widget code goes here

			baseClass: 'jimu-widget-classifier',
			//this property is set by the framework when widget is loaded.
			name: 'ThematicClassifer',
			operLayerInfos: [],
			layerItems: null,
			subLayerItems: null,
			fieldItems: null,
			_test: null,
			parameters: {},
			legend: null,
			defaultFrom: "#96ff73",
			defaultTo: "#00008c",
			txtBreaks: null,
			btnSubmit: null,
			//methods to communication with app container:

			postCreate: function () {
				this.inherited(arguments);
				this.opLayers = this.map.itemInfo.itemData.operationalLayers; //Operational Layers
				//console.log('postCreate');
			},

			startup: function () {
				this.inherited(arguments);

				arrayUtils.forEach(this.map.getLayersVisibleAtScale(this.map.getScale()), function (layer) {
					if ((layer.id.match(/tematicas/i)) && (!layer.suspended)) {
						this.operLayerInfos.push(layer);
					}
				}, this);
				var map = this.map;
				this.createLayerSelect(this.operLayerInfos);
			},

			onOpen: function () {
				console.log('onOpen');
			},

			onClose: function () {
				console.log('onClose');
			},
			createLayerSelect: function (operLayerInfos) {
				var htmlF = "<div id='divCapas'></div>";
				var node = domConstruct.toDom(htmlF);
				domConstruct.place(node, 'capas');
				var store = new Memory({
					data: this.operLayerInfos
				});
				this.layerItems = new FilteringSelect({
					store: store,
					placeHolder: 'Seleccione una capa',
					style: "width: 75%; height: 30px;",
					searchAttr: "id"
				}, "divCapas");
				this.layerItems.on('change', lang.hitch(this, this.getSubLayers));
			},

			getSubLayers: function () {
				this.parameters.layer = this.layerItems.item;
				if (this.subLayerItems == null) {
					if (this.fieldItems != null) {
						this.fieldItems.destroy();
						this.fieldItems = null;
					}
					if (this.txtBreaks != null && this.btnSubmit != null) {
						this.txtBreaks.destroy();
						this.txtBreaks = null;
						this.btnSubmit.destroy();
						this.btnSubmit = null;
					}
					var htmlF = "<div id='divSubCapas'></div>";
					var node = domConstruct.toDom(htmlF);
					domConstruct.place(node, 'subCapas');
					console.info(this.layerItems.item);
					var layer = this.layerItems.item;
					var layerInfos = [];
					// this.parameters.url = this.layerItems.item.url;
					arrayUtils.forEach(layer.layerInfos, function (lyrInf) {
						arrayUtils.forEach(layer.visibleLayers, function (vi) {
							if (lyrInf.id == vi) {
								layerInfos.push(lyrInf);
							}
						});
					});
					console.info('visible layerInfos');
					console.log(layerInfos);
					var store = new Memory({
						data: layerInfos
					});
					this.subLayerItems = new FilteringSelect({
						store: store,
						placeHolder: 'Seleccione una subcapa',
						style: "width: 75%; height: 30px;",
						searchAttr: 'name'
					}, "divSubCapas");
					this.subLayerItems.startup();
					this.subLayerItems.on('change', lang.hitch(this, this.sendResults));
				} else {
					this.subLayerItems.destroy();
					this.subLayerItems = null;
					this.getSubLayers();
				}
			},
			sendResults: function () {
				if (this.txtBreaks != null && this.btnSubmit != null) {
					this.txtBreaks.destroy();
					this.txtBreaks = null;
					this.btnSubmit.destroy();
					this.btnSubmit = null;
				}
				if (this.fieldItems == null) {
					var htmlF = "<div id='divCampos'></div>";
					var node = domConstruct.toDom(htmlF);
					domConstruct.place(node, 'campos');
					this.parameters.idPos = this.subLayerItems.item.id;
					this.parameters.url = this.layerItems.item.url;
					var url = this.parameters.url + '/' + this.parameters.idPos;
					this.parameters.url = url;
					this.getResults(this.parameters.url);
				} else {
					this.fieldItems.destroy();
					this.fieldItems = null;
					this.sendResults();
				}
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
					console.info(resp);
					if (resp.fields) {
						this.parameters.geometryType = resp.geometryType;
						var fields = [];
						arrayUtils.forEach(resp.fields, function (f) {
							fields.push(f);
						});
						this.getFields(fields);
					} else {
						this.genericSubLayerItems(resp.layers);
					}
				}), function (err) {
					console.log("failed to get field names: ", err);
				});
			},

			getFields: function (fields) {
				// filtering the fields
				var filterFields = [];
				arrayUtils.forEach(fields, function (field) {
					if ((field.type === 'esriFieldTypeString' && field.domain) || (field.type === 'esriFieldTypeInteger' && field.alias.match(/identificador/i) == null) || (field.type === 'esriFieldTypeDouble' && field.name !== 'shape.STLength()')) {
						filterFields.push(field);
					}
				});
				console.info(filterFields);
				var store = new Memory({
					data: filterFields
				});
				if (this.fieldItems) {
					this.fieldItems.set('store', store);
				} else {
					this.fieldItems = new ComboBox({
						store: store,
						placeHolder: 'Seleccione un campo',
						style: "width: 75%; height: 30px;",
						searchAttr: 'alias'
					}, 'divCampos');
				}
				this.fieldItems.startup();
				this.fieldItems.on('change', lang.hitch(this, this.setParameters));
			},
			setParameters: function (value) {
				// console.log(value);
				if (this.txtBreaks != null && this.btnSubmit != null) {
					this.txtBreaks.destroy();
					this.txtBreaks = null;
					this.btnSubmit.destroy();
					this.btnSubmit = null;
				}
				console.info(this.fieldItems.item);
				if (this.fieldItems.item.domain) {
					this.parameters.isDomain = true;
					this.parameters.domainObject = this.fieldItems.item.domain;
				} else {
					this.parameters.isDomain = false;
				}
				this.parameters.field = this.fieldItems.item.name;
				console.info('selected parameters');
				console.log(this.parameters);

				this.chooseRender();
			},
			generateWidget: function () {
				if (this._test == null) {
					var htmlF = "<div id='wPrueba'></div>";
					var node = domConstruct.toDom(htmlF);
					domConstruct.place(node, 'prueba');

					var store = new Memory({
						data: this.operLayerInfos
					});
					this._test = new ComboBox({
						store: store,
						placeHolder: 'Seleccione',
						searchAttr: "id"
					}, "wPrueba");
					this._test.startup();
				}
			},
			destroyWidget: function () {
				this._test.destroy();
				this._test = null;
			},
			getResponse: function (url) {
				var request = esriRequest({
					url: url,
					content: {
						f: "json"
					},
					callbackParamName: "callback"
				});
				request.then(lang.hitch(this, function (resp) {
					console.info(resp);
				}), function (err) {
					console.log("failed to get field names: ", err);
				});
			},
			setUrls: function () {
				var url1,
					url2;
				url1 = 'http://avestruz.uis.edu.co:6080/arcgis/rest/services/BARRANCABERMEJA/MAPA_TEMATICO_MALLA_GBD/MapServer';
				url2 = 'http://avestruz.uis.edu.co:6080/arcgis/rest/services/BARRANCABERMEJA/MAPA_TEMATICO_MALLA_GBD/MapServer/1';
				console.warn('ANCHO CALZADA');
				this.getResponse(url1);
				console.warn('TIPO RODADURA');
				this.getResponse(url2);
				for (var i = 0; i < 5; i++) {
					var randomID = this.randomID();
					console.log('randomID: ' + randomID);
				}
			},
			chooseRender: function () {
				if (this.parameters.isDomain) {
					console.log(this.parameters.domainObject);
					this.uniqueValRender();
				} else {
					if (this.txtBreaks == null && this.btnSubmit == null) {
						var htmlF = "<input id='txtBreaks'></input>";
						var node = domConstruct.toDom(htmlF);
						domConstruct.place(node, 'datos');
						this.txtBreaks = new TextBox({
							value: '',
							placeHolder: 'Ingrese numero de intervalos'
						}, 'txtBreaks');
						this.txtBreaks.startup();
						htmlF = "<button id='btnSubmit' type='button'></button>";
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
				colorRamp.algorithm = "hsv"; // options are:  "cie-lab", "hsv", "lab-lch"

				// this is because the layer is line type
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
				if (!this.legend) {
					this.createLegend();
				}
			},
			createLegend: function () {
				this.legend = new Legend({
					map: this.map,
					layerInfos: [{
						layer: this.parameters.layer,
						title: this.parameters.layer.id
					}
					]
				}, this.legendDiv);
				this.legend.startup();
			},

			errorHandler: function (err) {
				console.log("error: ", JSON.stringify(err));
			},
			uniqueValRender: function () {
				var randomColor;
				console.info(this.parameters.field);
				var renderer = new UniqueValueRenderer(this.createSymbol(), this.parameters.field);
				var codedValues = this.parameters.domainObject.codedValues;
				var color;
				for (var i = 0; i < codedValues.length; i++){
					randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
					color = new Color(randomColor);
					var symbol = this.createSymbol();
					renderer.addValue({
						value:codedValues[i].code,
						symbol:symbol.setColor(color),
						label:codedValues[i].name,
						description:''
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
				if (!this.legend) {
					this.createLegend();
				}

			},
			createSymbol: function () {
				if (this.parameters.geometryType == 'esriGeometryPolyline') {
					return new SimpleLineSymbol(
						SimpleLineSymbol.STYLE_SOLID,
						new Color([0, 0, 0]),
						5);
				}
				if (this.parameters.geometryType == 'esriGeometryPoint') {
					var marker = new SimpleMarkerSymbol();
					marker.setOffset(0, 0);
					marker.setColor(new Color([0, 0, 0, 1]));
					marker.setSize(8);
					return marker;
				}
				if (this.parameters.geometryType == 'esriGeometryPolygon') {
					return new SimpleFillSymbol("solid", null, null);
				}
			},
			genericSubLayerItems: function () {
				var idNode = this.randomID();
				var htmlF = "<div id='" + idNode + "'></div>";
				node = domConstruct.toDom(htmlF);
				domConstruct.place(node, 'subCapas');
				var store = new Memory({
					data: filterFields
				});
				var newSubLayer = new ComboBox({
					store: store,
					placeHolder: 'Seleccione una subcapa',
					style: "width: 75%; height: 30px;",
					searchAttr: 'alias'
				}, 'divCampos');

				newSubLayer.set('store', store);
			},
			randomID: function () {
				var text = "";
				var possible = "abcdefghijklmnopqrstuvwxyz0123456789";

				for (var i = 0; i < 6; i++)
					text += possible.charAt(Math.floor(Math.random() * possible.length));

				text = 'div' + text;
				return text;
			}
			// onMinimize: function(){
			//   console.log('onMinimize');
			// },

			// onMaximize: function(){
			//   console.log('onMaximize');
			// },

			// onSignIn: function(credential){
			//   /* jshint unused:false*/
			//   console.log('onSignIn');
			// },

			// onSignOut: function(){
			//   console.log('onSignOut');
			// }

			// onPositionChange: function(){
			//   console.log('onPositionChange');
			// },

			// resize: function(){
			//   console.log('resize');
			// }

			//methods to communication between widgets:

		});
	});