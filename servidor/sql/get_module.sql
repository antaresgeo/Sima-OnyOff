-- drop function get_module(bigint, text);
create or replace function get_module(id_module bigint, module_name text) returns json as
$$
declare dat json;
begin
    if id_module is null or module_name is null then
       return '[]';
    else
       EXECUTE 'select COALESCE(array_to_json(array_agg(row_to_json(c))), ' || chr(39) || '[]' || chr(39) || ') from (
         select * from mdl_' || module_name || ' where id = ' || id_module || '
       ) as c' into dat;
       return dat;
    end if;

end;
$$
language plpgsql;

-- select * from get_module(12, 'assign');
