CREATE OR REPLACE FUNCTION public.fn_region2bbox()
  RETURNS trigger AS
$BODY$
    BEGIN
        NEW.geom_geojson := ST_AsGeoJSON(NEW.geom,7);
        NEW.center := ST_PointOnSurface(NEW.geom);
        NEW.bbox := ST_Envelope(NEW.geom);
        NEW.bbox_geojson := ST_AsGeoJSON(NEW.bbox,7);
                NEW.center_geojson := ST_AsGeoJSON(NEW.center,7);
        RETURN NEW;
    END;
$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;

CREATE TABLE public.tb_region2bbox
(
  resource_name character varying(50) NOT NULL,
  description character varying(50) NOT NULL,
  geocod character varying(50) NOT NULL,
  name character varying(50) NOT NULL,
  geom geometry(Geometry,4674) NOT NULL,
  bbox geometry(Polygon,4674) NOT NULL,
  center geometry(Point,4674) NOT NULL,
  bbox_geojson text NOT NULL,
  geom_geojson text,
  center_geojson text,
  CONSTRAINT pk_tb_region2bbox PRIMARY KEY (resource_name, geocod)
)
WITH (
  OIDS=FALSE
);

CREATE TRIGGER tg_tb_region2bbox
  BEFORE INSERT OR UPDATE
  ON public.tb_region2bbox
  FOR EACH ROW
  EXECUTE PROCEDURE public.fn_region2bbox();

