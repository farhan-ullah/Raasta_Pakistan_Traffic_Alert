import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  type ListRenderItem,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { fetchGeocodeSearch, type GeocodePlace } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type Props = {
  value: string;
  onChange: (v: string) => void;
  selected: GeocodePlace | null;
  onSelect: (place: GeocodePlace) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function LocationAutocomplete({
  value,
  onChange,
  selected,
  onSelect,
  placeholder = "Search for a place…",
  disabled,
}: Props) {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<GeocodePlace[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = value.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetchGeocodeSearch(q)
        .then((rows: GeocodePlace[]) => {
          setSuggestions(rows);
          setOpen(true);
        })
        .catch(() => setSuggestions([]))
        .finally(() => setLoading(false));
    }, 320);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const pick = (p: GeocodePlace) => {
    onSelect(p);
    setOpen(false);
    setSuggestions([]);
  };

  const renderItem: ListRenderItem<GeocodePlace> = ({ item }) => (
    <TouchableOpacity
      onPress={() => pick(item)}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.text }}>{item.label}</Text>
      <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 3 }} numberOfLines={2}>
        {item.fullName}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.card,
          paddingHorizontal: 12,
        }}
      >
        <Feather name="map-pin" size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
        <TextInput
          value={value}
          onChangeText={(t) => {
            onChange(t);
            setOpen(true);
          }}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          editable={!disabled}
          autoCorrect={false}
          autoCapitalize="none"
          style={{ flex: 1, paddingVertical: 12, fontSize: 14, color: colors.text }}
        />
        {loading ? <ActivityIndicator size="small" color={colors.primaryLight} /> : null}
      </View>
      {selected ? (
        <Text style={{ fontSize: 11, color: colors.primary, marginTop: 8 }}>
          {selected.state ? `${selected.state} · ` : null}⌖ {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
        </Text>
      ) : (
        <Text style={{ fontSize: 11, color: "#b45309", marginTop: 8 }}>
          Choose a suggestion so we can save coordinates and region.
        </Text>
      )}
      {open && suggestions.length > 0 ? (
        <View
          style={{
            marginTop: 8,
            maxHeight: 200,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.card,
            overflow: "hidden",
          }}
        >
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={suggestions}
            keyExtractor={(s) => s.id}
            renderItem={renderItem}
            nestedScrollEnabled
          />
        </View>
      ) : null}
    </View>
  );
}
