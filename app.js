var express = require('express');
var compression = require('compression');
var mcache = require('memory-cache');

var app = express();

app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

app.use(compression())

let duration = 24 * 60 * 60;
var cache = (duration) => {
    return (req, res, next) => {
        let key = '__express__' + req.originalUrl || req.url
        let cachedBody = mcache.get(key)
        if (cachedBody) {
            res.send(cachedBody)
            return
        } else {
            res.sendResponse = res.send
            res.send = (body) => {
                mcache.put(key, body, duration * 1000);
                res.sendResponse(body)
            }
            next()
        }
    }
}

const { Pool, Client } = require('pg')

const pool = new Pool({
  user: "postgres", //process.env.userName,
  host: "localhost", //process.env.host,
  database: "o_banco", //process.env.database,
  password: "postgres", //process.env.passwd,
  port: 5432,
})


function parser_rows(rows){
	var features = [];
	var count = 0;
	for (var i in rows){
		row = rows[i];
		feature = {"type": "Feature"};
		if (params["geom"] != 'none'){
			feature["geometry"] = row["geom"];
		}
		feature["properties"] = {"geocod":row["geocod"], "name":row["name"]};

		features[count] = feature;
		count += 1;
	}
	return features
}

function parser_rows_json(rows){
	var features = {};
	for (var i in rows){
		row = rows[i];
		features[parseInt(row["geocod"])] = {"name":row["name"]};
	}
	return features
}

function execute_query(query, res){
	pool.query(query, (err, res_sql) => {
		rows = res_sql.rows;
		features = parser_rows(rows)			
		res.send( { "type": "FeatureCollection","features": features});
	})	
}

function make_query(params){
	var base = 'SELECT ' + params.properties.toString();
	if (params.hasOwnProperty('geom')){
		if (params["geom"] != 'none'){
			base += ',' + params.geom;
		}
	}
	base += ' FROM public.tb_region2bbox ';
	if (params.hasOwnProperty('query')){
		base += ' WHERE ' + params.query;
	}
	if (params.hasOwnProperty('append')){
		base += ' ' + params.append;
	}
	return base;

}

function get_geom_type(req){
	var geom_types = {'bbox': 'bbox_geojson::json as geom',
			'geom':'geom_geojson::json as geom',
			'center': 'center_geojson::json as geom',
			'none':'none'}
	
	if (req.query.hasOwnProperty('geom_type')){
		geom_type = req.query['geom_type'];
		if (geom_types.hasOwnProperty(geom_type)){
			return geom_types[geom_type];
		}
		else{
			return geom_types['bbox'];
		}
	}
	else{
		return geom_types['bbox'];
	}
}

app.get('/', cache(duration), function (req, res) {
	params = {"properties":["resource_name", "description"],
			"append": `GROUP BY resource_name, description`};
	var resource_sql = make_query(params);
	pool.query(resource_sql, (err, res_sql) => {
		res.send(res_sql.rows);
	})
	
});

app.get('/bbox/:resource/', cache(duration), function (req, res) {
	if (req.query.hasOwnProperty('id')){
		var id_list = "'" + req.query['id'].replace(/,/g, "','") +"'";

		var resource_sql = `SELECT ST_AsGeoJson(ST_Extent(bbox)) as bbox FROM public.tb_region2bbox 
			WHERE resource_name = '${req.params.resource}' AND geocod IN (${id_list}) GROUP BY resource_name;`;

		pool.query(resource_sql, (err, res_sql) => {
			res.send(res_sql.rows[0]);
		})		
	}
	else{
		res.send({"error": `Informe os ids da camada ${req.params.resource} para o qual deseja calcular o BBOX.`});
	}
});

app.get('/:resource/', cache(duration), function (req, res) {
	params = {"properties":["geocod", "name"],
				"geom": get_geom_type(req),
				"query": `resource_name =  '${req.params.resource}'`};
	var resource_sql = make_query(params);
	var result = execute_query(resource_sql, res)
	
});

app.get('/:resource/:id/', cache(duration), function (req, res) {
	params = {"properties":["geocod", "name"],
			"geom":get_geom_type(req),
			"query": `resource_name =  '${req.params.resource}' AND geocod = '${req.params.id}'`};
	var resource_sql = make_query(params);
	var result = execute_query(resource_sql, res)
	
});

app.listen(3001, function () {
	console.log('Region2BBOX listening on port 3001!');
});
