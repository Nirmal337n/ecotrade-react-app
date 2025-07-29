import { useState, useEffect, useCallback, useRef } from 'react';
import { logError } from '../utils/helpers.js';

// Generic API hook
export const useApi = (apiFunction, dependencies = [], options = {}) => {
  const [data, setData] = useState(options.initialData || null);
  const [loading, setLoading] = useState(options.immediate !== false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      logError(err, `API call failed`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, [execute]);

  const refetch = useCallback(() => execute(), [execute]);

  return {
    data,
    loading,
    error,
    execute,
    refetch,
    setData,
    setError
  };
};

// Debounced API hook
export const useDebouncedApi = (apiFunction, delay = 500, dependencies = []) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiFunction(...args);
      setData(result);
      return result;
    } catch (err) {
      setError(err.message);
      logError(err, `Debounced API call failed`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, dependencies);

  const debouncedExecute = useCallback(
    debounce(execute, delay),
    [execute, delay]
  );

  return {
    data,
    loading,
    error,
    execute: debouncedExecute,
    setData,
    setError
  };
};

// Pagination hook
export const usePagination = (apiFunction, options = {}) => {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: options.limit || 20,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPage = useCallback(async (page = 1, additionalParams = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit: pagination.limit,
        ...additionalParams
      };
      
      const result = await apiFunction(params);
      
      if (options.append && page > 1) {
        setData(prev => [...prev, ...(result.data || result.products || result)]);
      } else {
        setData(result.data || result.products || result);
      }
      
      setPagination(prev => ({
        ...prev,
        page,
        total: result.total || result.pagination?.total || 0,
        pages: result.pages || result.pagination?.pages || 0
      }));
      
      return result;
    } catch (err) {
      setError(err.message);
      logError(err, `Pagination API call failed`);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, pagination.limit, options.append]);

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.pages) {
      fetchPage(pagination.page + 1);
    }
  }, [fetchPage, pagination.page, pagination.pages]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      fetchPage(pagination.page - 1);
    }
  }, [fetchPage, pagination.page]);

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= pagination.pages) {
      fetchPage(page);
    }
  }, [fetchPage, pagination.pages]);

  const refresh = useCallback(() => {
    fetchPage(pagination.page);
  }, [fetchPage, pagination.page]);

  return {
    data,
    pagination,
    loading,
    error,
    fetchPage,
    nextPage,
    prevPage,
    goToPage,
    refresh,
    setData,
    setError
  };
};

// Local storage hook
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logError(error, `Reading localStorage key "${key}"`);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      logError(error, `Setting localStorage key "${key}"`);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      logError(error, `Removing localStorage key "${key}"`);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

// Debounce hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Previous value hook
export const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

// Toggle hook
export const useToggle = (initialValue = false) => {
  const [value, setValue] = useState(initialValue);
  
  const toggle = useCallback(() => setValue(v => !v), []);
  const setTrue = useCallback(() => setValue(true), []);
  const setFalse = useCallback(() => setValue(false), []);
  
  return [value, toggle, setTrue, setFalse];
};

// Array state hook
export const useArray = (initialValue = []) => {
  const [array, setArray] = useState(initialValue);

  const push = useCallback((element) => {
    setArray(arr => [...arr, element]);
  }, []);

  const filter = useCallback((callback) => {
    setArray(arr => arr.filter(callback));
  }, []);

  const update = useCallback((index, newElement) => {
    setArray(arr => [
      ...arr.slice(0, index),
      newElement,
      ...arr.slice(index + 1)
    ]);
  }, []);

  const remove = useCallback((index) => {
    setArray(arr => [
      ...arr.slice(0, index),
      ...arr.slice(index + 1)
    ]);
  }, []);

  const clear = useCallback(() => {
    setArray([]);
  }, []);

  return {
    array,
    set: setArray,
    push,
    filter,
    update,
    remove,
    clear
  };
};

// Form hook
export const useForm = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const setError = useCallback((name, error) => {
    setErrors(prev => ({ ...prev, [name]: error }));
  }, []);

  const setFieldTouched = useCallback((name, isTouched = true) => {
    setTouched(prev => ({ ...prev, [name]: isTouched }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    
    Object.keys(validationRules).forEach(field => {
      const rule = validationRules[field];
      const value = values[field];
      
      if (rule.required && !value) {
        newErrors[field] = rule.message || `${field} is required`;
      } else if (rule.validate && !rule.validate(value)) {
        newErrors[field] = rule.message || `${field} is invalid`;
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    setTouched: setFieldTouched,
    validate,
    reset,
    isValid: Object.keys(errors).length === 0
  };
};

// Helper function for debounce (if not imported)
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
