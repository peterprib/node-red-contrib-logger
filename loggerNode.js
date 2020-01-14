const Logger = require("./logger");
const logger = new Logger("logger Node");
logger.sendInfo("Copyright 2020 Jaroslav Peter Prib");

if(logger.active) logger.send("test active");

const adminActions=["setOn","setOff"];
module.exports = function (RED) {
	function loggerNode (n) {
	    RED.nodes.createNode(this, n);
	    var node = Object.assign(this, n);
	    if(node.active) logger.send({label:"initialising",parameters:n});
	    node.logger=new Logger({
	    	label:"logger Node:"+(node.name||node.id),
	    	count:node.count
	    });
	    node.logger.setNodeStatus(node);
	    node.on('input', function (msg) {
	    	logger.send({label:"input"});
	   	    if(node.logger.active) {
	   	    	node.logger.send({label:"input",message:msg});
	   	    	if(node.sendOutputLog)
	   	    		node.send([null,msg]);
	   	    }
	    	node.send(msg);
	    });
	    node.on('close', function (removed, done) {
	      node.connection.close(false, () => {
	   	    if(node.logger.active) node.logger.send({label:"close"});
	      });
	      done();
	    });
	}
	RED.nodes.registerType('Logger', loggerNode);
	RED.httpAdmin.get('/Logger/:id/:action/', RED.auth.needsPermission('Logger.write'), function (req, res) {
	    if(logger.active) logger.send({label:"httpAdmin",request:{params:req.params}});
	    const node = RED.nodes.getNode(req.params.id)
	    if (node && node.type === 'Logger') {
	    	try {
	    		if (adminActions.includes(req.params.action)) {
	    			node.logger[req.params.action]();
	    			return;
		        }
		        throw Error('unknown action: ' + req.params.action)
	    	} catch (err) {
	    		const reason1 = 'Internal Server Error, ' + req.params.action + ' failed ' + err.toString()
	    		if(node.logger.active) node.logger.send({label:"httpAdmin", request:req.params,error:reason1});
	    		res.status(500).send(reason1);
	    	}
	    } else {
	    	const reason2 = 'request to ' + req.params.action + ' failed for id:' + req.params.id;
	    	if(logger.active) logger.send({label:"httpAdmin",error:reason2});
	    	res.status(404).send(reason2);
	    }
	});
};
