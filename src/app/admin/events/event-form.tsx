"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input, Textarea, describedBy } from "@/components/ui/form";
import { createEvent, type EventFormState } from "./actions";

const initial: EventFormState = {};

export function EventForm() {
  const [state, action, pending] = React.useActionState(createEvent, initial);
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  const err = (name: string) => state.fieldErrors?.[name];

  return (
    <Card>
      <CardContent className="p-7">
        <form ref={formRef} action={action} className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg leading-snug">New event</h2>
            <p className="text-sm text-muted">
              Saved as a draft. Students see nothing until you publish it.
            </p>
          </div>

          {state.error ? <Alert tone="error">{state.error}</Alert> : null}
          {state.ok ? <Alert tone="success">Event created as a draft.</Alert> : null}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Title" htmlFor="title" error={err("title")} required>
              <Input id="title" name="title" required aria-describedby={describedBy("title", { error: err("title") })} />
            </Field>

            <Field
              label="Slug"
              htmlFor="slug"
              hint="Used in the URL, e.g. health-camp-march"
              error={err("slug")}
              required
            >
              <Input
                id="slug"
                name="slug"
                required
                aria-describedby={describedBy("slug", {
                  hint: "Used in the URL, e.g. health-camp-march",
                  error: err("slug"),
                })}
              />
            </Field>

            <Field label="Starts" htmlFor="starts_at" error={err("starts_at")} required>
              <Input id="starts_at" name="starts_at" type="datetime-local" required />
            </Field>

            <Field label="Ends" htmlFor="ends_at" error={err("ends_at")}>
              <Input id="ends_at" name="ends_at" type="datetime-local" />
            </Field>

            <Field label="Location" htmlFor="location" error={err("location")}>
              <Input id="location" name="location" />
            </Field>

            <Field
              label="Capacity"
              htmlFor="capacity"
              hint="Leave blank for unlimited"
              error={err("capacity")}
            >
              <Input id="capacity" name="capacity" type="number" min={1} step={1} />
            </Field>

            <Field
              label="Registration deadline"
              htmlFor="registration_deadline"
              error={err("registration_deadline")}
            >
              <Input id="registration_deadline" name="registration_deadline" type="datetime-local" />
            </Field>

            <Field label="Organiser" htmlFor="organizer" error={err("organizer")}>
              <Input id="organizer" name="organizer" />
            </Field>
          </div>

          <Field label="Description" htmlFor="description" error={err("description")}>
            <Textarea id="description" name="description" rows={4} />
          </Field>

          <Button type="submit" loading={pending}>
            Create draft
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
