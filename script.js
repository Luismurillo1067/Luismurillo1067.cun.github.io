let graphData = { nodes: [], edges: [] };
let graph = null;
let fordFulkersonSteps = [];
let currentStepIndex = 0;
let maxFlow = 0;
let svg;


function createGraph() {
  // 1. Obtener nodos y aristas del input
    const nodesInput = document.getElementById('nodes').value.trim();
    const edgesInput = document.getElementById('edges').value.trim();

    if(!nodesInput || !edgesInput){
        alert("Por favor, completa todos los campos.")
        return;
    }
    graphData = parseNetworkInput(nodesInput, edgesInput);

    // 2. Inicializar el grafo con D3.js
    renderGraph();
}

function renderGraph() {
     // Limpiar el contenedor de la visualización
    const container = document.getElementById('graph-container');
    container.innerHTML = '';

    const width = container.clientWidth;
    const height = container.clientHeight;

    svg = d3.select(container).append("svg").attr("width", width).attr("height", height);

    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.edges).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .selectAll("line")
      .data(graphData.edges)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrowhead)");

      const arrowhead = svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5");

    const edgeLabels = svg.append("g")
      .selectAll(".edge-label")
      .data(graphData.edges)
      .enter()
      .append("text")
        .attr("class", "edge-label")
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#000") // Color del texto
        .text(d => d.capacity)
    
    const node = svg.append("g")
      .selectAll("circle")
      .data(graphData.nodes)
      .join("circle")
      .attr("r", 20)
      .attr("fill", "#69b3a2")
      .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));
    
    const nodeLabels = svg.append("g")
      .selectAll(".node-label")
      .data(graphData.nodes)
      .enter()
      .append("text")
        .attr("class", "node-label")
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#fff") // Color del texto
        .text(d => d.id)

    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
            
        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        nodeLabels
            .attr("x", d => d.x)
            .attr("y", d => d.y + 5);

        edgeLabels
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2 - 5);

        });

        function dragstarted(event,d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }
        
        function dragged(event, d) {
            d.fx = event.x;
            d.fy = event.y;
        }
        
        function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }
    }

  function parseNetworkInput(nodesInput, edgesInput) {
    const nodes = nodesInput.split(',').map(node => ({ id: node.trim() }));
    const edges = edgesInput.split(',').map(edge => {
        const parts = edge.trim().split('-');
        return { source: parts[0].trim(), target: parts[1].trim(), capacity: parseInt(parts[2].trim()), flow: 0 };
    });
      return { nodes, edges };
  }
  
function runFordFulkerson() {
    // 1. Inicializar la red residual
    const residualGraph = initResidualGraph();

    // 2. Ejecutar el algoritmo de Ford-Fulkerson y guardar los pasos
    fordFulkersonSteps = fordFulkerson(residualGraph);
    maxFlow = fordFulkersonSteps[fordFulkersonSteps.length - 1].maxFlow
    // 3. Actualizar la visualización para el primer paso
    currentStepIndex = 0;
    updateVisualization();
    updateFlowResult()
}
function initResidualGraph() {
    const residualNodes = graphData.nodes.map(node => ({ ...node }));
    const residualEdges = graphData.edges.flatMap(edge => {
      const forwardEdge = { ...edge,  capacity: edge.capacity, flow: 0 };
      const backwardEdge = { source: edge.target, target: edge.source, capacity: 0, flow: 0};
      return [forwardEdge, backwardEdge];
    });
    return { nodes: residualNodes, edges: residualEdges };
}
  
function fordFulkerson(residualGraph) {
    const steps = [];
    let maxFlow = 0;
    const source = residualGraph.nodes[0].id;
    const sink = residualGraph.nodes[residualGraph.nodes.length - 1].id;
    let pathFound = true;

    while (pathFound) {
        const path = bfs(residualGraph, source, sink);

        if (path === null) {
            pathFound = false;
            break;
        }
        
        let pathFlow = Infinity;
        for (let i = 0; i < path.length - 1; i++) {
            const edge = residualGraph.edges.find(
            e => e.source === path[i] && e.target === path[i + 1]
            );
            pathFlow = Math.min(pathFlow, edge.capacity - edge.flow);
        }
        
        for (let i = 0; i < path.length - 1; i++) {
            let edge = residualGraph.edges.find(
                e => e.source === path[i] && e.target === path[i + 1]
            );
            if(edge){
                edge.flow += pathFlow;
            }
            
            edge = residualGraph.edges.find(
                e => e.source === path[i+1] && e.target === path[i]
            )
            if(edge){
              edge.capacity += pathFlow;
            }
        }

        maxFlow += pathFlow;
    
        steps.push({ graphState:JSON.parse(JSON.stringify(residualGraph)), maxFlow:maxFlow, path });
    }

    return steps;
}

function bfs(graph, source, sink) {
    const queue = [[source, []]]; // Queue: [node, path]
    const visited = new Set();

    while (queue.length > 0) {
        const [currentNode, path] = queue.shift();
        visited.add(currentNode);

        if (currentNode === sink) {
            return path.concat([currentNode]);
        }

        const neighbors = graph.edges.filter(edge => edge.source === currentNode && edge.capacity - edge.flow > 0);

        for (const neighborEdge of neighbors) {
            if (!visited.has(neighborEdge.target)) {
                queue.push([neighborEdge.target, path.concat([currentNode])]);
            }
        }
    }
    return null;
}
function updateVisualization() {
  if (currentStepIndex < fordFulkersonSteps.length) {
    const step = fordFulkersonSteps[currentStepIndex];
    const graphState = step.graphState;
    const path = step.path;
    
    // Limpiar el contenedor de la visualización
    const container = document.getElementById('graph-container');
    container.innerHTML = '';

    const width = container.clientWidth;
    const height = container.clientHeight;
    
    svg = d3.select(container).append("svg").attr("width", width).attr("height", height);

    const simulation = d3.forceSimulation(graphState.nodes)
      .force("link", d3.forceLink(graphState.edges).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const links = svg.append("g")
      .selectAll("line")
      .data(graphState.edges)
      .join("line")
        .attr("stroke", d => d.capacity ? "#999": "lightgray")
        .attr("stroke-opacity", 0.6)
        .attr("stroke-width", 2)
        .attr("marker-end", d => d.capacity ? "url(#arrowhead)" : "");

      const arrowhead = svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-5L10,0L0,5");

    const edgeLabels = svg.append("g")
        .selectAll(".edge-label")
        .data(graphState.edges)
        .enter()
        .append("text")
            .attr("class", "edge-label")
            .attr("text-anchor", "middle")
            .attr("font-size", "12px")
            .attr("fill", "#000") // Color del texto
            .text(d => `${d.flow}/${d.capacity}`)
    
    const node = svg.append("g")
      .selectAll("circle")
      .data(graphState.nodes)
      .join("circle")
      .attr("r", 20)
      .attr("fill", "#69b3a2")

    const nodeLabels = svg.append("g")
      .selectAll(".node-label")
      .data(graphState.nodes)
      .enter()
      .append("text")
        .attr("class", "node-label")
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("fill", "#fff") // Color del texto
        .text(d => d.id)

    simulation.on("tick", () => {
        links
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        
        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
            
        nodeLabels
            .attr("x", d => d.x)
            .attr("y", d => d.y + 5);

        edgeLabels
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2 - 5);
        });

      // Resaltar el camino actual
      if(path){
      links.attr("stroke", d => {
        for(let i = 0; i < path.length -1; i++){
            if(d.source.id === path[i] && d.target.id === path[i+1])
                return "red";
            }
        return  d.capacity? "#999":"lightgray"
        })
      }
    updateLog(`Paso ${currentStepIndex+1}: ${path ? "Camino encontrado: "+ path.join(" -> ") : "No se encontraron más caminos"} Flujo Actual: ${step.maxFlow}`)
  }
}
function nextStep() {
    currentStepIndex++;
    if (currentStepIndex < fordFulkersonSteps.length) {
        updateVisualization();
    } else {
        updateLog('Flujo máximo alcanzado.');
    }
}

function updateFlowResult(){
    document.getElementById('max-flow-value').textContent = maxFlow;
}

function updateLog(message) {
    const logDiv = document.getElementById('log');
    logDiv.textContent += message + "\n";
    logDiv.scrollTop = logDiv.scrollHeight;
}