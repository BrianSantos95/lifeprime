alter table daily_tasks
add column if not exists position integer not null default 0;

with ordered_tasks as (
  select id, row_number() over (partition by user_id, day order by created_at) - 1 as new_position
  from daily_tasks
)
update daily_tasks
set position = ordered_tasks.new_position
from ordered_tasks
where daily_tasks.id = ordered_tasks.id;
