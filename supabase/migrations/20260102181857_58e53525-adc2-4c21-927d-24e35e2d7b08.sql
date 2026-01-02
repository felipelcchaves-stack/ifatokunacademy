-- Migração para converter exercícios fill-columns do formato antigo (cells) para o novo (string[][])
-- Usando função PL/pgSQL para lidar com a conversão de tipos

CREATE OR REPLACE FUNCTION convert_fill_columns_rows()
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  rec RECORD;
  new_rows jsonb;
  row_item jsonb;
  cell_item jsonb;
  new_row jsonb;
BEGIN
  FOR rec IN 
    SELECT id, content
    FROM exercises 
    WHERE type = 'fill-columns'
      AND content ? 'rows'
      AND jsonb_array_length(content->'rows') > 0
      AND jsonb_typeof(content->'rows'->0) = 'object'
      AND content->'rows'->0 ? 'cells'
  LOOP
    new_rows := '[]'::jsonb;
    
    FOR row_item IN SELECT * FROM jsonb_array_elements(rec.content->'rows')
    LOOP
      new_row := '[]'::jsonb;
      
      FOR cell_item IN SELECT * FROM jsonb_array_elements(row_item->'cells')
      LOOP
        new_row := new_row || to_jsonb(cell_item->>'text');
      END LOOP;
      
      new_rows := new_rows || jsonb_build_array(new_row);
    END LOOP;
    
    UPDATE exercises 
    SET content = jsonb_set(content, '{rows}', new_rows)
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Executar a conversão
SELECT convert_fill_columns_rows();

-- Remover a função temporária após uso
DROP FUNCTION IF EXISTS convert_fill_columns_rows();