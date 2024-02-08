const requireYml = require('require-yml');
const fs = require('fs');
let data = {
	_strings: requireYml('./sde/fsd/typeIDs.yaml'),
	_groups: requireYml('./sde/fsd/marketGroups.yaml'),
	_blueprints: requireYml('./sde/fsd/blueprints.yaml')
}

const saveGroups = [
	'Ships',
	'Manufacture & Research',
	'Blueprints & Reactions'
];
const metaGroupID = 2;

class SDEDumper
{
	constructor()
	{
		this._groups = {};
		this._items = {};
		this._blueprints = {};
		Object.keys(data._groups).forEach(this.readMarketGroups.bind(this));
		Object.keys(data._strings).forEach(this.readStrings.bind(this));
//		this._items = {46207: "Tungsten Carbide Reaction Formula"};
		Object.keys(this._items).forEach(this.readBlueprints.bind(this));
		fs.writeFileSync('sde.json', JSON.stringify(this._blueprints));
	}
	
	_readMarketGroupTree(parentGroupID)
	{
		Object.keys(data._groups).forEach((id) => {
			let entry = data._groups[id];
			if (parentGroupID == entry.parentGroupID) {
				this._groups[id] = entry.nameID.en;
				if (typeof(entry.descriptionID) !== 'undefined') {
					this._groups[id] += ' (' + entry.descriptionID.en + ')';
				}
				this._readMarketGroupTree(id);
			}
		});
	}
	readMarketGroups(id)
	{
		let entry = data._groups[id];
		if (entry && (typeof(entry.nameID) !== 'undefined') && (saveGroups.indexOf(entry.nameID.en) >= 0)) {
			this._groups[id] = entry.nameID.en;
			this._readMarketGroupTree(id);
		}
	}
	readStrings(id)
	{
		let entry = data._strings[id];
		if ((typeof(entry.metaGroupID) !== 'undefined') && (entry.metaGroupID == metaGroupID)) {
			if (typeof(data._blueprints[id]) !== 'undefined') {
				data._blueprints[id].isTech2 = true;
			}
		}
		this._items[id] = entry.name.en;
	}
	readBlueprints(id)
	{
		let entry = data._blueprints[id];
		if (typeof(entry) !== 'undefined') {
			if (typeof(entry.activities.manufacturing) !== 'undefined' 
				&& typeof(entry.activities.manufacturing.products) !== 'undefined'
				&& typeof(entry.activities.manufacturing.materials) !== 'undefined') {
				let result = {input: entry.activities.manufacturing.materials, output: {}};
				result.input.forEach((v) => {
					v.name = this._items[v.typeID];
				});
				result.output.typeID = entry.activities.manufacturing.products[0].typeID;
				result.output.name = this._items[entry.activities.manufacturing.products[0].typeID];
				result.output.quantity = entry.activities.manufacturing.products[0].quantity;
				if (typeof(entry.activities.research_material) !== 'undefined') {
					result.isResearchable = true;
					result.efficiency = 10;
				}
				if (entry.isTech2) {
					result.isTech2 = true;
					delete result.isResearchable;
					delete result.efficiency;
				}
				this._blueprints[id] = result;
			} else if (typeof(entry.activities.reaction) !== 'undefined') {
				let result = {input: entry.activities.reaction.materials, output: {}};
				result.input.forEach((v) => {
					v.name = this._items[v.typeID];
				});
				result.output.typeID = entry.activities.reaction.products[0].typeID;
				result.output.name = this._items[entry.activities.reaction.products[0].typeID];
				result.output.quantity = entry.activities.reaction.products[0].quantity;
				result.isReaction = true;
				this._blueprints[id] = result;
			}
		}
	}
}

new SDEDumper();
