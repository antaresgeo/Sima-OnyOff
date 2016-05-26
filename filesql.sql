select array_to_json(array_agg(row_to_json(c2))) from (
	select 
		cs.id, 
		cs.name section, 
		cs.summary,
		(select array_to_json(array_agg(row_to_json(c1))) from (
		       select
				cm.instance, cm.module,
				mm.name,
				mm.intro
			from mdl_course_modules as cm
			join mdl_modules as md
				on (
					cm.id  = any (regexp_split_to_array("sequence", ',')::bigint[])
					and
					md.id = cm.module
				)
				cross join get_module(cm.instance, md.name) as mm
			) as c1
		) as modules
	from mdl_course_sections as cs

	where cs.course = 4788
) as c2;
--select * from mdl_context limit 200;