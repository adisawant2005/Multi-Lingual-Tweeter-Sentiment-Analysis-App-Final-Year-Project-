export type RootStackParamList = {
  Home: undefined;
  Details: {
    // navigation to Details can either include an itemId (legacy) or
    // an endpoint label and the API response to display.
    itemId?: number;
    endpoint?: string;
    response?: unknown;
  };
};