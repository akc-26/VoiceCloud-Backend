import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  FormHelperText,
  Grid,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'email' | 'password' | 'select' | 'switch' | 'textarea';
  options?: { label: string; value: string | number }[];
  defaultValue?: any;
  required?: boolean;
  gridSpan?: number; // 1 to 12
}

interface FormBuilderProps {
  fields: FormField[];
  onSubmit: (data: any) => void;
  submitText?: string;
  isLoading?: boolean;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  fields,
  onSubmit,
  submitText = 'Submit',
  isLoading = false,
}) => {
  const defaultValues = fields.reduce((acc, f) => {
    acc[f.name] = f.defaultValue !== undefined ? f.defaultValue : f.type === 'switch' ? false : '';
    return acc;
  }, {} as Record<string, any>);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues });

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 1 }}>
      <Grid container spacing={2}>
        {fields.map((field) => {
          const span = field.gridSpan || 12;
          return (
            <Grid key={field.name} item xs={12} sm={span}>
              <Controller
                name={field.name}
                control={control}
                rules={{ required: field.required ? `${field.label} is required` : false }}
                render={({ field: controllerField }) => {
                  if (field.type === 'switch') {
                    return (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={Boolean(controllerField.value)}
                            onChange={(e) => controllerField.onChange(e.target.checked)}
                          />
                        }
                        label={field.label}
                      />
                    );
                  }

                  if (field.type === 'select') {
                    return (
                      <FormControl fullWidth size="small" error={Boolean(errors[field.name])}>
                        <InputLabel>{field.label}</InputLabel>
                        <Select
                          {...controllerField}
                          label={field.label}
                          sx={{ borderRadius: 2 }}
                        >
                          {field.options?.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </Select>
                        {errors[field.name] && (
                          <FormHelperText>{errors[field.name]?.message as string}</FormHelperText>
                        )}
                      </FormControl>
                    );
                  }

                  return (
                    <TextField
                      {...controllerField}
                      fullWidth
                      size="small"
                      type={field.type}
                      label={field.label}
                      multiline={field.type === 'textarea'}
                      rows={field.type === 'textarea' ? 4 : 1}
                      error={Boolean(errors[field.name])}
                      helperText={errors[field.name]?.message as string}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  );
                }}
              />
            </Grid>
          );
        })}
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" type="submit" disabled={isLoading} sx={{ px: 4, py: 1, borderRadius: 2 }}>
          {submitText}
        </Button>
      </Box>
    </Box>
  );
};
