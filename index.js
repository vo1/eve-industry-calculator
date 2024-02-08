const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
let data = require('./sde.json');

class SDEData
{
	calculate(w, requestedQuantity, efficiency)
	{
		let result = {component: [], reaction: [], resource: []},
			self = this;
		function _calculate(w, requestedQuantity, efficiency)
		{
			if (w === null) {
				return;
			}
			let numRuns = Math.ceil(requestedQuantity / w.output.quantity);
			if (typeof(efficiency) === 'undefined') {
				efficiency = 0;
			}
			if (w.efficiency) {
				efficiency = w.efficiency;
			}
			w.input.forEach((inputComponent) => {
				let component = self.findId(inputComponent.typeID),
					type = self.getType(component),
					amount = Math.ceil(numRuns * inputComponent.quantity * (100 - efficiency) / 100);
				if (typeof(result[type][inputComponent.name]) === 'undefined') {
					result[type][inputComponent.name] = { id: inputComponent.typeID, name: inputComponent.name, amount: 0 };
				}
				result[type][inputComponent.name].amount += amount;
				if (type !== 'resource') {
					_calculate(component, amount);
				}
			});
		}
		_calculate(w, requestedQuantity, efficiency);
		return result;
	}
	
	postprocess(data)
	{
		Object.keys(data).forEach((type) => {
			Object.keys(data[type]).forEach((name) => {
				let component = data[type][name],
					bp = this.findId(component.id);
				if (bp && (typeof(bp.output) !== 'undefined')) {
					component.runs = Math.ceil(component.amount / bp.output.quantity);
					component.output = bp.output.quantity;
				}
			})
		})
		return data;
	}
	
	getType(c)
	{
		if (typeof(c) === 'undefined' || c == null) {
			return 'resource';
		}
		if (c.isReaction) {
			return 'reaction'
		}
		return 'component';
	}
	
	findId(itemID)
	{
		let result = null;
		Object.keys(data).forEach((id) => {
			let entry = data[id];
			if ((typeof(entry.output) !== 'undefined')
				&& (typeof(entry.output.typeID) !== 'undefined')
				&& entry.output.typeID === itemID) {
				result = entry;
			}
		});
		return result;
	}
	
	find(query)
	{
		let findings = [], result = null;
		Object.keys(data).forEach((id) => {
			let entry = data[id];
			if ((typeof(entry.output) !== 'undefined')
				&& (typeof(entry.output.name) !== 'undefined')
				&& (entry.output.name.toLowerCase().indexOf(query.toLowerCase()) >= 0)) {
				findings.push(entry);
			}
		});
		findings.forEach((bp) => {
			if (bp.output.name.toLowerCase() === query.toLowerCase()) {
				result = bp;
			}
		});
		if (result !== null) {
			return result;
		} else {
			console.log('Multiple items has been found, please clarify:');
			findings.forEach((bp) => {
				console.log(bp.output.typeID, bp.output.name);
			});
		}
		return null;
	}
	
	dump(data, csv)
	{
		data = this.postprocess(data);
		let header = false;
		if (csv) {
			Object.keys(data).forEach((type) => {
				Object.keys(data[type]).forEach((name) => {
					if (!header) {
						console.log(Object.keys(data[type][name]).join(';'));
						header = true;
					}
					console.log(Object.values(data[type][name]).join(';'));
				})
			})
			return;
		}
		console.log('----- COMPONENTS -----');
		Object.keys(data.component).forEach((name) => {
			console.log(name, data.component[name].amount);
		});
		console.log('----- REACTIONS -----');
		Object.keys(data.reaction).forEach((name) => {
			console.log(name, data.reaction[name].amount);
		});
		console.log('----- RESOURCES -----');
		Object.keys(data.resource).forEach((name) => {
			console.log(name, data.resource[name].amount);
		});
	}
}

let SDE = new SDEData();
rl.setPrompt('Q> ');
rl.prompt();

rl.on('line', (rq) => {
	rq = rq.split(',');
	let item = SDE.find(rq[0]),
		qty = rq[1],
		eff = rq[2];
		csv = rq[3];
	if (typeof(qty) === 'undefined') {
		qty = 1
	}
	if (typeof(eff) === 'undefined') {
		eff = 10
	}
	if (typeof(csv) === 'undefined') {
		csv = false;
	}

	if (typeof(item) !== 'undefined') {
		SDE.dump(SDE.calculate(item, qty, eff), csv);
	}
	rl.prompt();
});
