;(function(undefined) {
    'use strict';
    var that = this,
        graphPath = 'data/mld_vgraph.json',
        sigmaParams = {
            type: 'canvas',
            container: 'sigma-container',
            settings: {
                labelSize: 'proportional',
                labelThreshold: 15,
                defaultLabelSize: 10,
                defaultNodeColor: '#000',
                scalingMode: 'inside',
                zoomMin: 1/16,
                zoomMax: 2
            }
        },
        defaultNodeSize = 1,
        minWeightColor = '#bbb',
        maxWeightColor = '#ff0000',
        disabledNodeColor = '#eee',
        disabledEdgeColor = '#eee',
        drawInactiveNodes = false,
        sigmaInst = null,
        svgInst = null;

    that.exec = function main() {

        // Before creating the object
        _bindSigmaMethods();

        // Async load json
        d3.json(graphPath, function(error, json) {
            if (error)
                return console.warn(error);

            sigmaParams.graph = json;
            sigmaInst = new sigma(sigmaParams);

            // Nodes and edges has already been assigned in the sigma object
            delete json.nodes;
            delete json.edges;

            // The rest of the properties are added (ad-hoc) on the graph object
            Object.defineProperty(sigmaInst.graph, 'graphProps', {
                value: json
            });

            _postProcessGraph();
            _createAxis();
            _createToggles();
            _bindEvents();

            return 'success';
        });
    };

    function _bindSigmaMethods() {
        // Add methods to sigma before instanciating the global object
        sigma.classes.graph.addMethod('neighbors', function(nodeId) {
            var k, neighbors = {}, index = this.allNeighborsIndex[nodeId] || {};
            for (k in index)
                neighbors[k] = this.nodesIndex[k];

            return neighbors;
        });

        sigma.classes.graph.addMethod('forwardDiffusion', function(nodeId) {
            var k,
                subgraph = {},
                index = this.outNeighborsIndex[nodeId] || {},
                visited = [],
                queue = [];

            // Enqueue first level
            for (k in index)
                queue.push(k);

            while (queue.length != 0) {
                var nid = queue.pop();
                subgraph[nid] = this.nodesIndex[nid];
                //  Get out-neighbors
                index = this.outNeighborsIndex[nid] || {};
                for (k in index) {
                    if (visited.indexOf(k) == -1) { // not visited
                        visited.push(k); // add to visited
                        queue.push(k); // enqueue
                    }
                }
            }
            return subgraph;
        });
    }

    function _postProcessGraph() {
        // Create color map
        var colorMap = d3.scale.linear()
            .domain([d3.min(sigmaInst.graph.nodes(), function(d) { return Math.abs(d.weight); }),
                     d3.max(sigmaInst.graph.nodes(), function(d) { return Math.abs(d.weight); })])
            .range([minWeightColor, maxWeightColor])
            .clamp(true);

        sigmaInst.graph.nodes().forEach(function(n) {
            // n.type = 'custom';
            n.color = colorMap(Math.abs(n.weight));
//            n.color = colorMap(n.weight);
            n.originalColor = n.color;
//            if (n.name) {
//                n.label = n.name;
//            }
            if ( n.pattern_id !== undefined || n.pattern_id !== null ) {
                n.label = n.pattern_id.toString();
            }

            if (!n.size) {
                n.size = defaultNodeSize;
            }
        });

        sigmaInst.graph.edges().forEach(function(e) {
            // e.type = 'custom';
            e.originalColor = e.color;
        });

        sigmaInst.refresh();
    }

    function _createAxis() {
        svgInst = d3.select("#svg-container");
        // TODO
    }

    function _createToggles() {
        var toggle = d3.select("#toggles");
        // TODO
    }

    function _bindEvents() {
        sigmaInst.bind('clickNode', _onClickNode);
        sigmaInst.bind('clickStage', _onClickStage);
        sigmaInst.camera.bind('coordinatesUpdated', _onCameraUpdate);
    }

    function _onClickNode(event) {
        var nodeId = event.data.node.id;
        var toKeep = sigmaInst.graph.forwardDiffusion(nodeId);
        toKeep[nodeId] = event.data.node;

        sigmaInst.graph.nodes().forEach(function(n) {

            if (toKeep[n.id]) {
//                console.log('clickedNode: ', n);
                n.color = n.originalColor;
            }
            else {
                n.color = disabledNodeColor;
                if (!drawInactiveNodes)
                    n.hidden = true;
            }
        });

        sigmaInst.graph.edges().forEach(function(e) {
            if (toKeep[e.source] && toKeep[e.target]) {
                e.color = e.originalColor;
            }
            else {
                e.color = disabledEdgeColor;
                if (!drawInactiveNodes)
                    e.hidden = true;
            }
        });

        sigmaInst.refresh();
    }

    function _onClickStage(event) {
        sigmaInst.graph.nodes().forEach(function(n) {
            n.color = n.originalColor;
            n.hidden = false;
        });

        sigmaInst.graph.edges().forEach(function(e) {
            e.color = e.originalColor;
            e.hidden = false;
        });

        sigmaInst.refresh();
    }

    function _onCameraUpdate(event) {
        // console.log(event.target);
    }

    // Run application
    that.exec();

}).call(this); // end anonymous namespace