create or replace function json_estudiante(codigo varchar(45)) returns text as 
$$
begin
	return (select array_to_json(array_agg(row_to_json(c3))) from (
	SELECT 
		u.id AS userid, 
		c.id AS courseid, 
		c.fullname,
		(
			select array_to_json(array_agg(row_to_json(c2))) from (
				select 
					cs.id, 
					cs.name section, 
					cs.summary, (
						select array_to_json(array_agg(row_to_json(c1))) from (
						       select
								cm.instance, 
								cm.module,
								cm.id,
								get_module(cm.instance, md.name) as module
							from ( 	select row_number() over() ord, num from
								unnest(regexp_split_to_array(cs."sequence", ',')) num
							) as seq
							join mdl_course_modules as cm on (
								case 
									when seq.num != '' then cm.id = seq.num::bigint
									else false
								end
							)
							join mdl_modules as md on (
								md.id = cm.module
							)
							order by seq.ord
						) as c1
					) as modules
					
				from mdl_course_sections as cs

				where cs.course = c.id
			) as c2
		) as sections
		FROM mdl_user u 
		JOIN mdl_user_enrolments ue ON (
			ue.userid = u.id 
			AND 
			u.username = codigo
			AND 
			u.suspended = 0 
			AND 
			u.deleted = 0 
			AND 
			(ue.timeend = 0 OR ue.timeend > extract ('epoch' from now()))
		) AND ue.status = 0
		JOIN mdl_enrol e ON e.id = ue.enrolid and e.status = 0
		JOIN mdl_role_assignments ra ON ra.userid = u.id
		JOIN mdl_context ct ON ct.id = ra.contextid AND ct.contextlevel = 50
		JOIN mdl_course c ON c.id = ct.instanceid AND e.courseid = c.id
		JOIN mdl_role r ON r.id = ra.roleid AND r.shortname = 'student'
	) as c3);
end;
$$
language plpgsql;

select * from json_estudiante('4151210018');