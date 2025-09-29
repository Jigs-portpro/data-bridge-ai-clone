--
-- PostgreSQL database dump
--

\restrict uW8MfAA6cp0xvnW6s9inCFfjb3NPCSQiGbhX5zvjn3hrK0bqYO4WVsOI8cKrAbG

-- Dumped from database version 17.6 (Debian 17.6-1.pgdg13+1)
-- Dumped by pg_dump version 17.6 (Debian 17.6-2.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: activate_entity(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.activate_entity(p_entity_key character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE entities
    SET is_active = true, updated_at = CURRENT_TIMESTAMP
    WHERE entity_key = p_entity_key;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.activate_entity(p_entity_key character varying) OWNER TO postgres;

--
-- Name: FUNCTION activate_entity(p_entity_key character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.activate_entity(p_entity_key character varying) IS 'Activates an entity by entity_key';


--
-- Name: audit_log_trigger(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_log_trigger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, changed_by)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD), session_user);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), session_user);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, changed_by)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW), session_user);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.audit_log_trigger() OWNER TO postgres;

--
-- Name: FUNCTION audit_log_trigger(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.audit_log_trigger() IS 'Automatically logs INSERT, UPDATE, DELETE operations to audit_logs table';


--
-- Name: cleanup_expired_session_overrides(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_session_overrides() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_base_url_overrides
    WHERE expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION public.cleanup_expired_session_overrides() OWNER TO postgres;

--
-- Name: FUNCTION cleanup_expired_session_overrides(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.cleanup_expired_session_overrides() IS 'Cleans up expired user session base URL overrides and returns count of deleted rows';


--
-- Name: deactivate_entity(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.deactivate_entity(p_entity_key character varying) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE entities
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE entity_key = p_entity_key;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.deactivate_entity(p_entity_key character varying) OWNER TO postgres;

--
-- Name: FUNCTION deactivate_entity(p_entity_key character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.deactivate_entity(p_entity_key character varying) IS 'Deactivates an entity by entity_key (soft delete)';


--
-- Name: get_effective_base_url(character varying, character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_effective_base_url(p_user_session_id character varying DEFAULT NULL::character varying, p_entity_key character varying DEFAULT NULL::character varying) RETURNS character varying
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
    result_url VARCHAR(500);
BEGIN
    -- Priority 1: User session override
    IF p_user_session_id IS NOT NULL THEN
        SELECT base_url INTO result_url
        FROM user_base_url_overrides
        WHERE user_session_id = p_user_session_id
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

        IF result_url IS NOT NULL THEN
            RETURN result_url;
        END IF;
    END IF;

    -- Priority 2: Entity-specific base URL configuration
    IF p_entity_key IS NOT NULL THEN
        SELECT buc.base_url INTO result_url
        FROM entities e
        JOIN base_url_configurations buc ON e.base_url_config_id = buc.id
        WHERE e.entity_key = p_entity_key
        AND e.is_active = true
        AND buc.is_active = true;

        IF result_url IS NOT NULL THEN
            RETURN result_url;
        END IF;
    END IF;

    -- Priority 3: Default base URL configuration
    SELECT base_url INTO result_url
    FROM base_url_configurations
    WHERE is_default = true AND is_active = true
    LIMIT 1;

    -- Priority 4: System fallback
    RETURN COALESCE(result_url, 'https://api.axle.network');
END;
$$;


ALTER FUNCTION public.get_effective_base_url(p_user_session_id character varying, p_entity_key character varying) OWNER TO postgres;

--
-- Name: FUNCTION get_effective_base_url(p_user_session_id character varying, p_entity_key character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_effective_base_url(p_user_session_id character varying, p_entity_key character varying) IS 'Resolves effective base URL using 4-tier priority: user override -> entity-specific -> default -> fallback';


--
-- Name: get_entity_config_with_fields(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_entity_config_with_fields(p_entity_key character varying) RETURNS TABLE(entity_id uuid, entity_key character varying, entity_name character varying, api_endpoint character varying, base_url character varying, field_id uuid, field_name character varying, field_type character varying, is_required boolean, sort_order integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id as entity_id,
        e.entity_key,
        e.name as entity_name,
        e.api_endpoint,
        get_effective_base_url(NULL, e.entity_key) as base_url,
        ef.id as field_id,
        ef.field_name,
        ef.field_type,
        ef.is_required,
        ef.sort_order
    FROM entities e
    LEFT JOIN entity_fields ef ON e.id = ef.entity_id AND ef.is_active = true
    WHERE e.entity_key = p_entity_key
    AND e.is_active = true
    ORDER BY ef.sort_order;
END;
$$;


ALTER FUNCTION public.get_entity_config_with_fields(p_entity_key character varying) OWNER TO postgres;

--
-- Name: FUNCTION get_entity_config_with_fields(p_entity_key character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_entity_config_with_fields(p_entity_key character varying) IS 'Retrieves complete entity configuration with all fields and resolved base URL (simplified version)';


--
-- Name: get_entity_lookup_associations(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_entity_lookup_associations(p_entity_key character varying) RETURNS TABLE(field_id uuid, field_name character varying, lookup_id character varying, lookup_name character varying, api_endpoint character varying, cache_ttl_minutes integer, lookup_field_mapping jsonb)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        ef.id as field_id,
        ef.field_name,
        ld.lookup_id,
        ld.lookup_name,
        ld.api_endpoint,
        ld.cache_ttl_minutes,
        fla.lookup_field_mapping
    FROM entities e
    JOIN entity_fields ef ON e.id = ef.entity_id
    JOIN field_lookup_associations fla ON ef.id = fla.field_id
    JOIN lookup_definitions ld ON fla.lookup_id = ld.lookup_id
    WHERE e.entity_key = p_entity_key
    AND e.is_active = true
    AND ef.is_active = true
    AND fla.is_active = true
    AND ld.is_active = true
    ORDER BY ef.sort_order;
END;
$$;


ALTER FUNCTION public.get_entity_lookup_associations(p_entity_key character varying) OWNER TO postgres;

--
-- Name: FUNCTION get_entity_lookup_associations(p_entity_key character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_entity_lookup_associations(p_entity_key character varying) IS 'Retrieves all lookup associations for entity fields';


--
-- Name: get_entity_validation_rules(character varying); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_entity_validation_rules(p_entity_key character varying) RETURNS TABLE(rule_id uuid, field_id uuid, field_name character varying, rule_type character varying, rule_config jsonb, error_message text, execution_order integer)
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        fvr.id as rule_id,
        ef.id as field_id,
        ef.field_name,
        fvr.rule_type,
        fvr.rule_config,
        fvr.error_message,
        fvr.execution_order
    FROM entities e
    JOIN entity_fields ef ON e.id = ef.entity_id
    JOIN field_validation_rules fvr ON ef.id = fvr.field_id
    WHERE e.entity_key = p_entity_key
    AND e.is_active = true
    AND ef.is_active = true
    AND fvr.is_active = true
    ORDER BY ef.sort_order, fvr.execution_order;
END;
$$;


ALTER FUNCTION public.get_entity_validation_rules(p_entity_key character varying) OWNER TO postgres;

--
-- Name: FUNCTION get_entity_validation_rules(p_entity_key character varying); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION public.get_entity_validation_rules(p_entity_key character varying) IS 'Retrieves all validation rules for an entity in execution order';


--
-- Name: update_entity_validations_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_entity_validations_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_entity_validations_updated_at() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: base_urls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.base_urls (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    url character varying(500) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.base_urls OWNER TO postgres;

--
-- Name: base_urls_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.base_urls_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.base_urls_id_seq OWNER TO postgres;

--
-- Name: base_urls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.base_urls_id_seq OWNED BY public.base_urls.id;


--
-- Name: entities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_key character varying(100) NOT NULL,
    name character varying(200) NOT NULL,
    api_endpoint character varying(500) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    upload_type character varying(50) DEFAULT 'SINGLE_ROW_UPLOAD'::character varying,
    is_active boolean DEFAULT true,
    CONSTRAINT entities_upload_type_check CHECK (((upload_type)::text = ANY ((ARRAY['BULK_UPLOAD'::character varying, 'SINGLE_ROW_UPLOAD'::character varying])::text[])))
);


ALTER TABLE public.entities OWNER TO postgres;

--
-- Name: TABLE entities; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.entities IS 'Entities table seeded with 14 basic entities from exportEntities.json (Feature 1 complete)';


--
-- Name: COLUMN entities.entity_key; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entities.entity_key IS 'Unique identifier key for the entity (e.g., load, carrier)';


--
-- Name: COLUMN entities.name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entities.name IS 'Human-readable display name for the entity';


--
-- Name: COLUMN entities.api_endpoint; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entities.api_endpoint IS 'API endpoint path for this entity';


--
-- Name: entity_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_fields (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_id uuid NOT NULL,
    field_name character varying(200) NOT NULL,
    display_name character varying(200) NOT NULL,
    field_type character varying(50) NOT NULL,
    is_required boolean DEFAULT false,
    min_length integer,
    max_length integer,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT entity_fields_field_type_check CHECK (((field_type)::text = ANY ((ARRAY['string'::character varying, 'number'::character varying, 'date'::character varying, 'boolean'::character varying, 'email'::character varying, 'time'::character varying, 'array'::character varying])::text[])))
);


ALTER TABLE public.entity_fields OWNER TO postgres;

--
-- Name: TABLE entity_fields; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.entity_fields IS 'Entity field definitions - field_name serves as both database field name and source column mapping';


--
-- Name: COLUMN entity_fields.field_name; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_fields.field_name IS 'Database field name - also used as source column for data import mapping';


--
-- Name: entity_validations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.entity_validations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    entity_field_id uuid NOT NULL,
    validation_type character varying(50) NOT NULL,
    pattern character varying(1000),
    enum_values jsonb,
    lookup_id character varying(100),
    lookup_field character varying(200),
    error_message character varying(500),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT entity_validations_check CHECK (((((validation_type)::text = 'regex'::text) AND (pattern IS NOT NULL)) OR (((validation_type)::text = 'enum'::text) AND (enum_values IS NOT NULL)) OR (((validation_type)::text = 'lookup'::text) AND (lookup_id IS NOT NULL) AND (lookup_field IS NOT NULL)))),
    CONSTRAINT entity_validations_validation_type_check CHECK (((validation_type)::text = ANY ((ARRAY['regex'::character varying, 'enum'::character varying, 'lookup'::character varying])::text[])))
);


ALTER TABLE public.entity_validations OWNER TO postgres;

--
-- Name: TABLE entity_validations; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.entity_validations IS 'Advanced validation rules for entity fields (regex, enum, lookup)';


--
-- Name: COLUMN entity_validations.validation_type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_validations.validation_type IS 'Type of validation: regex, enum, lookup';


--
-- Name: COLUMN entity_validations.pattern; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_validations.pattern IS 'Regex pattern for string validation (when validation_type = regex)';


--
-- Name: COLUMN entity_validations.enum_values; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_validations.enum_values IS 'JSON array of allowed values (when validation_type = enum)';


--
-- Name: COLUMN entity_validations.lookup_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_validations.lookup_id IS 'Lookup data source ID (when validation_type = lookup)';


--
-- Name: COLUMN entity_validations.lookup_field; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.entity_validations.lookup_field IS 'Field name within lookup data (when validation_type = lookup)';


--
-- Name: base_urls id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.base_urls ALTER COLUMN id SET DEFAULT nextval('public.base_urls_id_seq'::regclass);


--
-- Data for Name: base_urls; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.base_urls (id, name, url, description, is_active, created_at, updated_at) FROM stdin;
2	Production API	https://api.axle.network	Production API (Axle Network)	f	2025-09-25 00:21:21.96756	2025-09-26 17:34:57.362585
4	Local Development	http://localhost:3000	Local development server	f	2025-09-25 00:21:21.96756	2025-09-26 17:36:02.858964
1	Development API	https://new-api.dev.portpro.io	PortPro Development API environment	t	2025-09-25 00:21:21.96756	2025-09-26 17:36:02.863138
9	MedLog API	https://api.medlog.portpro.io	PortPro MedLog API endpoint	f	2025-09-25 00:46:59.543088	2025-09-26 14:58:16.044925
10	Forward Intermodal API	https://api.forwardintermodal.portpro.io	PortPro Forward Intermodal API endpoint	f	2025-09-25 00:46:59.543088	2025-09-25 14:55:28.360096
\.


--
-- Data for Name: entities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entities (id, entity_key, name, api_endpoint, created_at, updated_at, upload_type, is_active) FROM stdin;
112a935c-8566-4bab-8ecf-aeff6950322e	drivers	Drivers	/bulkupload/driver	2025-09-25 16:49:19.132517+00	2025-09-26 04:27:11.36267+00	BULK_UPLOAD	t
ab03bcbe-fb0a-423b-acc7-190cce2ae91e	perdiem	PerDiem	/tms/addFreeContainerReturn	2025-09-25 16:49:19.132517+00	2025-09-26 04:27:11.363197+00	SINGLE_ROW_UPLOAD	t
17b79de3-899f-437b-a760-f9d10409ebd8	truck_owner	Truck Owner	/bulkupload/fleetTruckOwners	2025-09-25 16:49:19.132517+00	2025-09-26 04:40:55.038848+00	BULK_UPLOAD	t
c7756c90-eac8-4ca6-981f-b14669d497d9	tariff	Tariff	/rate-engine/rate-record/bulk-upload	2025-09-25 16:49:19.132517+00	2025-09-26 04:41:18.370923+00	SINGLE_ROW_UPLOAD	t
ab231e05-cda9-44d0-b237-64b6d9c5d807	chassis_owner	Chassis Owner	/bulkupload/chassisowner	2025-09-25 16:49:19.132517+00	2025-09-26 04:41:34.191833+00	BULK_UPLOAD	t
248cb635-1db6-45da-93af-7c02a27909b4	carrier	Carrier	/createDrayosCarrier	2025-09-25 16:49:19.132517+00	2025-09-26 17:26:31.623683+00	SINGLE_ROW_UPLOAD	t
240dad78-08be-4833-b7ca-b38c5a1df71e	charge_profile	Charge Profile	/rate-engine/charge-templates/bulk-upload	2025-09-25 16:49:19.132517+00	2025-09-25 21:29:46.58097+00	SINGLE_ROW_UPLOAD	t
b018271e-8f0d-466e-bb1b-643654cf4918	load	Load	/tms/uploadLoad	2025-09-25 16:49:19.132517+00	2025-09-26 04:27:11.34819+00	SINGLE_ROW_UPLOAD	t
805c575b-6829-4bed-9f80-8cd007f35fce	trailers	Trailers	/bulkupload/equipments	2025-09-25 16:49:19.132517+00	2025-09-26 04:27:11.357702+00	BULK_UPLOAD	t
b3a6e082-a566-40ae-ab77-a69430e75bc6	trucks	Trucks	/bulkupload/equipments	2025-09-25 16:49:19.132517+00	2025-09-26 04:27:11.358631+00	BULK_UPLOAD	t
befdf04f-9729-4dd1-a846-7884473dc616	users	Users	/bulkupload/fleetManager	2025-09-25 16:49:19.132517+00	2025-09-26 04:27:11.359484+00	BULK_UPLOAD	t
9c9059a0-591f-4a92-837c-e901579b2082	chassis	Chassis	/bulkupload/chassis	2025-09-25 16:49:19.132517+00	2025-09-26 04:27:11.361137+00	BULK_UPLOAD	t
70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	people	People	/carrier/addFleetManager	2025-09-25 16:49:19.132517+00	2025-09-26 04:27:11.361712+00	SINGLE_ROW_UPLOAD	t
488e2572-2211-4d4e-bb7b-d76e35f235ac	organization	Organization	/bulkupload/customer	2025-09-25 16:49:19.132517+00	2025-09-26 04:27:11.362219+00	BULK_UPLOAD	t
\.


--
-- Data for Name: entity_fields; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_fields (id, entity_id, field_name, display_name, field_type, is_required, min_length, max_length, sort_order, created_at, updated_at) FROM stdin;
44bc2461-fc34-420f-a6b7-745a4cf16347	b018271e-8f0d-466e-bb1b-643654cf4918	caller	Customer	string	t	2	100	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2deed160-51c3-4799-bf8d-507632e257ba	b018271e-8f0d-466e-bb1b-643654cf4918	type_of_load	Load Type	string	t	\N	50	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
744ca506-1c76-4baf-8fb4-48e7786485af	b018271e-8f0d-466e-bb1b-643654cf4918	shipper	Pick Up Location	string	t	\N	200	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
aa798124-f9d8-4e5e-abd8-3c2a9184080a	b018271e-8f0d-466e-bb1b-643654cf4918	containerNo	Container	string	f	\N	20	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
bb7d31bf-2eb6-460e-a79c-c6ea3ae4cae7	b018271e-8f0d-466e-bb1b-643654cf4918	consignee	Delivery City/State	string	t	\N	100	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
da211b15-a184-45cf-8089-e9f2128beac2	b018271e-8f0d-466e-bb1b-643654cf4918	containerSize	Container Size	string	f	\N	10	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ef55ecf7-2522-4f93-8644-f49b55da0388	b018271e-8f0d-466e-bb1b-643654cf4918	containerType	Container Type	string	f	\N	10	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1bff3ae8-a41d-4b32-9e5a-4d2e02afd3bd	b018271e-8f0d-466e-bb1b-643654cf4918	weightLBS	Weight LBS	number	f	1	50	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
45e789b1-8c58-4777-ae18-24912cac64ce	b018271e-8f0d-466e-bb1b-643654cf4918	weightKGS	Weight KGS	number	f	1	50	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9332ae6b-d9c0-4987-8a1d-6a00a4f63125	b018271e-8f0d-466e-bb1b-643654cf4918	documents	Delivery Order	string	f	\N	50	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8f43a713-9fc6-4c5b-b01f-b1ec447846ce	b018271e-8f0d-466e-bb1b-643654cf4918	containerOwner	Owner	string	f	\N	100	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f1bd3e08-9800-49df-81a4-a1f2bf1f351d	b018271e-8f0d-466e-bb1b-643654cf4918	bookingNo	Booking #	string	f	\N	50	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d1a376c1-c6cb-4dfe-9606-feaed9ca4cfe	b018271e-8f0d-466e-bb1b-643654cf4918	callerbillLandingNo	Master Bill Of Lading	string	f	\N	50	13	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b101ca79-6343-4f54-ba1c-d22cb0d7e3d4	b018271e-8f0d-466e-bb1b-643654cf4918	vessel.eta	Container ETA	date	f	\N	\N	14	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
eda74c87-eb1c-40cd-a1fb-53db60531d6a	b018271e-8f0d-466e-bb1b-643654cf4918	lastFreeDay	Last Free Day	date	f	\N	\N	15	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
59f7d2fe-b6d9-436b-a5a8-b74a1481483e	b018271e-8f0d-466e-bb1b-643654cf4918	emptyOrigin	Container Return	string	f	\N	200	16	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1a967d26-b966-4a62-8c10-0459a0dd8d9f	b018271e-8f0d-466e-bb1b-643654cf4918	chassisPick	Hook Chassis Location	string	f	\N	200	17	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
40bcc89c-f5d1-48b9-b2c9-d3257007b4d6	b018271e-8f0d-466e-bb1b-643654cf4918	chassisTermination	Terminate Chassis Location	string	f	\N	200	18	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ad233410-8f89-4fdf-95a3-d4fde1928020	b018271e-8f0d-466e-bb1b-643654cf4918	secondaryReferenceNo	Reference #	string	f	\N	50	19	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5ad10f0d-9bab-480c-a16b-67df54cdfe85	b018271e-8f0d-466e-bb1b-643654cf4918	emptyDay	Empty Date	date	f	\N	\N	20	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
23bdfe04-25ec-4abe-b456-8324984adaa6	b018271e-8f0d-466e-bb1b-643654cf4918	return	Date Returned	date	f	\N	\N	21	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
bcf12239-486c-48e0-991d-335353c0a932	b018271e-8f0d-466e-bb1b-643654cf4918	pickupTimes	Pick Up Apt From	date	f	\N	\N	22	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
47a8b8fe-6fd7-44ca-90af-20fc9162167d	b018271e-8f0d-466e-bb1b-643654cf4918	deliveryTimes	Delivery Apt From	date	f	\N	\N	23	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
fcb77636-44d1-4baf-a0f6-54e5dccf5c02	b018271e-8f0d-466e-bb1b-643654cf4918	containerAvailableDay	ERD	date	f	\N	\N	24	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
20a67ece-2c00-455d-adf8-7337c54fe985	b018271e-8f0d-466e-bb1b-643654cf4918	freeReturnDate	Per Diem Free Day	date	f	\N	\N	25	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
52057873-92b0-464a-867c-6de08e61aa5c	b018271e-8f0d-466e-bb1b-643654cf4918	loadTime	Loaded Date	date	f	\N	\N	26	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
eb896879-f9fa-447e-9fd9-f11b221265e6	b018271e-8f0d-466e-bb1b-643654cf4918	billingDate	Billing Date	date	f	\N	\N	27	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7b6f9047-913e-40f9-ae20-ebd61b1d6618	b018271e-8f0d-466e-bb1b-643654cf4918	chassisNo	Chassis #	string	f	\N	20	28	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
377e2088-1490-468f-b139-85539541afc9	b018271e-8f0d-466e-bb1b-643654cf4918	chassisOwner	Chassis Owner	string	f	\N	100	29	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6c2f6002-edb5-4928-b15b-20676398e3e0	b018271e-8f0d-466e-bb1b-643654cf4918	chassisSize	Chassis Size	string	f	\N	10	30	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6e594950-a341-47f1-860b-d27c59512a21	b018271e-8f0d-466e-bb1b-643654cf4918	chassisType	Chassis Type	string	f	\N	10	31	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d05494be-bbb6-4aec-9a94-01560a7272c5	b018271e-8f0d-466e-bb1b-643654cf4918	cutOff	Cut Off Date	date	f	\N	\N	32	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7b32f4d2-6a5a-4f2c-b5fb-5596fb7271fa	b018271e-8f0d-466e-bb1b-643654cf4918	doNo	House Bill Of Lading	string	f	\N	50	33	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
40ff5825-6b51-43fa-a59c-01378c5fe255	b018271e-8f0d-466e-bb1b-643654cf4918	callerPONo	Pick Up #	string	f	\N	50	34	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
88cd7d90-8c73-481e-92e8-28452f7a2f38	b018271e-8f0d-466e-bb1b-643654cf4918	purchaseOrderNo	Purchase Order #	string	f	\N	50	35	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5bad92f9-9421-4b64-a586-482f239dc808	b018271e-8f0d-466e-bb1b-643654cf4918	sealNo	Seal #	string	f	\N	20	36	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4785d196-4aaf-4a13-8a36-79250e10bc20	b018271e-8f0d-466e-bb1b-643654cf4918	shipmentNo	Shipment #	string	f	\N	50	37	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
942691a5-4c9d-4b77-946f-c4b4f28b9189	b018271e-8f0d-466e-bb1b-643654cf4918	temperature	Temperature	number	f	\N	\N	38	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
57b5fadb-0c4b-474d-8321-760fa756ba77	b018271e-8f0d-466e-bb1b-643654cf4918	terminal	Branch	string	f	\N	100	39	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
205511c8-0c3e-4ca3-87d9-cd9bfa857c0b	b018271e-8f0d-466e-bb1b-643654cf4918	deliveryOrderNo	Vessel Name	string	f	\N	100	40	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
14d5e2c7-144b-44ce-8be8-d061ce14dab1	b018271e-8f0d-466e-bb1b-643654cf4918	releaseNo	Voyage	string	f	\N	50	41	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
76200153-a680-4086-8954-95d571906c6d	b018271e-8f0d-466e-bb1b-643654cf4918	commodity	Commodity	string	f	\N	100	42	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
337cd386-adf4-43ae-ba98-463d06cc7aee	b018271e-8f0d-466e-bb1b-643654cf4918	pieces	Pieces	number	f	\N	\N	43	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0457def1-c71f-488e-8b8a-5062b341d90c	b018271e-8f0d-466e-bb1b-643654cf4918	hazmat	Hazmat	boolean	f	\N	\N	44	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
912282ab-999a-4f00-8360-9784c3582e48	b018271e-8f0d-466e-bb1b-643654cf4918	hot	Hot	boolean	f	\N	\N	45	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6b4f0cdf-f29f-4be7-b0de-8ecfebbac312	b018271e-8f0d-466e-bb1b-643654cf4918	overweight	Overweight	boolean	f	\N	\N	46	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
443ad4eb-a17b-4162-b4b8-9d8401e78339	b018271e-8f0d-466e-bb1b-643654cf4918	routes	Routes	string	f	\N	100	47	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
cdfa94ec-7fe7-4b17-93e8-c0ee8f6d26b6	b018271e-8f0d-466e-bb1b-643654cf4918	isGenset	Genset	boolean	f	\N	\N	48	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
fb0aad5c-cc5b-4a9e-898c-b9183dfac4dc	b018271e-8f0d-466e-bb1b-643654cf4918	liquor	Liquor	boolean	f	\N	\N	49	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
054e4c38-c352-4604-9a9a-2bdefc949a45	b018271e-8f0d-466e-bb1b-643654cf4918	overheight	Overheight	boolean	f	\N	\N	50	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2b669e71-82dc-4703-8b99-3d44d43d4199	b018271e-8f0d-466e-bb1b-643654cf4918	isStreetTurn	Street Turn	boolean	f	\N	\N	51	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
269d29fa-339f-4447-9b78-57a271067214	b018271e-8f0d-466e-bb1b-643654cf4918	scale	Scale	boolean	f	\N	\N	52	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d19d26c2-9e91-4baa-ad2d-f14f157c4eb5	248cb635-1db6-45da-93af-7c02a27909b4	company_name	Company Name	string	t	2	100	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1311d0c7-e0b5-4b3d-a4c5-32900f901bfc	248cb635-1db6-45da-93af-7c02a27909b4	contactName	Contact Name	string	t	2	100	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
62111707-9e62-4b13-ac06-2da1a193a0f3	248cb635-1db6-45da-93af-7c02a27909b4	address	Address	string	t	5	200	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1cbd9438-af10-437c-9ec3-0c7954e8417d	248cb635-1db6-45da-93af-7c02a27909b4	country	Country	string	t	\N	\N	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
466bbf97-638b-4669-866b-cfa878cc5b8f	248cb635-1db6-45da-93af-7c02a27909b4	state	State	string	t	\N	\N	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
fd854093-8434-49d7-9a96-ee6689c4a38d	248cb635-1db6-45da-93af-7c02a27909b4	city	City	string	t	2	50	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
65d60e55-d419-492c-a41d-2d7b38cd999a	248cb635-1db6-45da-93af-7c02a27909b4	zip	ZIP	string	t	\N	\N	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
268e1873-25a4-4c74-9605-1645ee9062aa	248cb635-1db6-45da-93af-7c02a27909b4	email	Login Email Address	string	t	\N	\N	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8c7ce401-07ae-4abc-8231-aee63345573f	248cb635-1db6-45da-93af-7c02a27909b4	tenderEmail	Tender Email Address 1	string	t	\N	\N	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2092ce26-d728-4a2b-b3ec-d153b125f85c	248cb635-1db6-45da-93af-7c02a27909b4	Tender Email Address 2	Tender Email Address 2	string	f	\N	\N	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5ca9487f-fb54-4d09-8a80-b722c3b8ea22	248cb635-1db6-45da-93af-7c02a27909b4	Tender Email Address 3	Tender Email Address 3	string	f	\N	\N	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
39e594c3-15ad-4ae3-9a95-b3dc75fe6266	248cb635-1db6-45da-93af-7c02a27909b4	mobile	Phone Number	string	t	\N	\N	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d8d3d955-c7a3-4272-8554-7d55072aab52	248cb635-1db6-45da-93af-7c02a27909b4	scac	SCAC	string	f	\N	\N	13	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2a45feb6-5f81-464f-b195-ce7cf123a0d0	248cb635-1db6-45da-93af-7c02a27909b4	mcNumber	MC#	string	f	\N	\N	14	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a01f08d5-2179-465f-b4fe-ffcf9a422940	248cb635-1db6-45da-93af-7c02a27909b4	USDOTNumber	USDOT Number	string	f	\N	\N	15	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f1951f7a-dff6-4bc7-b06c-0adde428cc57	248cb635-1db6-45da-93af-7c02a27909b4	External ID	External ID	string	f	\N	50	16	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3ed7b8ad-d056-4edd-997a-124316533fff	248cb635-1db6-45da-93af-7c02a27909b4	terminals	Branch 1	string	f	\N	50	17	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ba253391-d924-49b8-a3c4-db49721be2da	c7756c90-eac8-4ca6-981f-b14669d497d9	Tariff Name	Tariff Name	string	t	2	100	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
586ebcda-fc33-4fb1-8425-a1bfd5d61527	c7756c90-eac8-4ca6-981f-b14669d497d9	Effective Start Date	Effective Start Date	date	f	\N	\N	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5e5a39b9-df45-4021-8eb5-7e188c20f369	c7756c90-eac8-4ca6-981f-b14669d497d9	Effective End Date	Effective End Date	date	f	\N	\N	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
06daf481-e8fa-40b0-b91f-14fe08af4e0f	c7756c90-eac8-4ca6-981f-b14669d497d9	Load Type	Load Type	string	f	\N	\N	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
bc522581-d7db-4c4f-8d4b-e8cd9ae3944f	c7756c90-eac8-4ca6-981f-b14669d497d9	Branch	Branch	string	f	\N	\N	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c8202212-d1f7-4c1a-9462-640a83093edd	c7756c90-eac8-4ca6-981f-b14669d497d9	Customer	Customer	string	f	2	100	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c0087681-9b1b-49cf-8749-d0167dcdfc20	c7756c90-eac8-4ca6-981f-b14669d497d9	Pick Up Location	Pick Up Location	string	f	2	100	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0ed6931c-30ad-4bab-af2c-cd32ad245c43	c7756c90-eac8-4ca6-981f-b14669d497d9	Delivery Location	Delivery Location	string	f	2	100	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7d63e0af-5c2c-4948-97b4-6ca036ec1d82	c7756c90-eac8-4ca6-981f-b14669d497d9	Return Location	Return Location	string	f	2	100	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
966cb508-6882-4f1c-b4fe-66aa87e7bd01	c7756c90-eac8-4ca6-981f-b14669d497d9	Charge Profile	Charge Profile	string	f	2	100	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2c83f743-a627-4487-bf16-c6ac26757f20	c7756c90-eac8-4ca6-981f-b14669d497d9	vendorType	Vendor	string	f	\N	\N	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0da9f4d5-b91c-4d40-9ee6-846c41f644a4	805c575b-6829-4bed-9f80-8cd007f35fce	equipmentID	Trailer #	string	t	\N	\N	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f805a97f-97f2-40ff-aff4-5f375356d1de	805c575b-6829-4bed-9f80-8cd007f35fce	year	Year	string	f	\N	\N	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1facb0e3-d9c7-40ed-b02e-579454d10d5d	805c575b-6829-4bed-9f80-8cd007f35fce	make	Make	string	f	\N	50	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a277371f-0d21-4a92-a771-1005b2c4b088	805c575b-6829-4bed-9f80-8cd007f35fce	model	Model	string	f	\N	50	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
fbcb4816-bd72-417b-b6ac-2ebe4d1595d0	805c575b-6829-4bed-9f80-8cd007f35fce	AID	AID	date	f	\N	\N	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6b33d713-7b92-45d9-b3dc-2caee7603c57	805c575b-6829-4bed-9f80-8cd007f35fce	ITD	ITD	date	f	\N	\N	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9d26c976-adb3-4088-ab73-ca292840980a	805c575b-6829-4bed-9f80-8cd007f35fce	vin	VIN	string	f	\N	\N	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8e71036c-85e0-43f4-9647-a09f839c4fca	805c575b-6829-4bed-9f80-8cd007f35fce	reg_expiration	Registration Expiration	date	f	\N	\N	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5c1b44ee-b7d7-4aa7-a127-b01e900b11b2	805c575b-6829-4bed-9f80-8cd007f35fce	inspection_exp	Inspection Expiration	date	f	\N	\N	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
82fa25a6-bd99-4096-b688-54fe3a60d87c	805c575b-6829-4bed-9f80-8cd007f35fce	licence_plate_state	License Plate State	string	f	\N	\N	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0c62ed29-45c2-4bdd-b9fd-53800db32696	805c575b-6829-4bed-9f80-8cd007f35fce	licence_plate_number	License Plate #	string	f	\N	\N	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6a463a8b-111e-42df-86d9-87dc109e7771	805c575b-6829-4bed-9f80-8cd007f35fce	hut_exp	HUT Expiration	date	f	\N	\N	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
23fc93db-3032-469d-a5e8-e365be4b716f	805c575b-6829-4bed-9f80-8cd007f35fce	trailerType	Trailer Type	string	f	\N	50	13	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
813dba57-2162-4d07-8431-f080a11add40	805c575b-6829-4bed-9f80-8cd007f35fce	size	Trailer Size	string	f	\N	\N	14	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6ffec36c-84c9-4c55-b54a-c243f5191007	805c575b-6829-4bed-9f80-8cd007f35fce	Branch	Branch	string	t	\N	100	15	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
309c43e6-6c82-492b-a49c-be1081db9958	17b79de3-899f-437b-a760-f9d10409ebd8	company_name	Company Name	string	t	2	100	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
bc99c546-8df7-4a6b-9451-50262bddb8e9	17b79de3-899f-437b-a760-f9d10409ebd8	address	Address	string	t	5	200	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6b1c9cdd-69cb-4337-90ab-03435d934ae6	17b79de3-899f-437b-a760-f9d10409ebd8	DOTNumber	DOT #	string	f	2	15	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
95ed7741-5640-456e-82ba-4164367cd7eb	17b79de3-899f-437b-a760-f9d10409ebd8	MCNumber	MC #	string	f	\N	\N	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
efc2617a-5bfd-462f-b2a9-0e99dfcbc0df	17b79de3-899f-437b-a760-f9d10409ebd8	main_contact_name	Main Contact Name	string	f	2	100	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b243369d-795c-4f1a-98f7-15e606598b47	17b79de3-899f-437b-a760-f9d10409ebd8	secondary_contact_name	Secondary Contact Name	string	f	2	100	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
930fd250-b880-40ec-b4b3-f5aa25f9c076	17b79de3-899f-437b-a760-f9d10409ebd8	mobile	Mobile	string	f	\N	\N	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
92d68759-83a4-4cfd-8fce-64239772afc3	17b79de3-899f-437b-a760-f9d10409ebd8	email	Email	string	f	\N	\N	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4068093e-3f06-48c7-98f9-d2a0e1d1ae52	17b79de3-899f-437b-a760-f9d10409ebd8	taxId	Tax ID/EIN #	string	f	2	15	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d58052d3-31c1-48e4-b81f-1fd8a8bb5126	17b79de3-899f-437b-a760-f9d10409ebd8	ssn	SSN	string	f	2	15	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
103c882c-2952-4265-8e11-950f005a1d53	b3a6e082-a566-40ae-ab77-a69430e75bc6	equipmentID	Equipment ID	string	t	\N	\N	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
85b0eb09-7707-4ad3-858c-23dbd26b5b17	b3a6e082-a566-40ae-ab77-a69430e75bc6	licence_plate_state	License State	string	f	\N	\N	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b8a8ad13-d5e3-40cf-9fce-63f8858c4cdf	b3a6e082-a566-40ae-ab77-a69430e75bc6	licence_plate_number	License Plate #	string	f	\N	\N	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
60436197-33b2-4df7-8e18-49137023c32d	b3a6e082-a566-40ae-ab77-a69430e75bc6	year	Year	string	f	\N	\N	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8fc3dd68-923d-488f-9f7a-afc771d45ffe	b3a6e082-a566-40ae-ab77-a69430e75bc6	make	Make	string	f	\N	50	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
db04959a-380a-4290-ac09-ce279db2d8bd	b3a6e082-a566-40ae-ab77-a69430e75bc6	model	Model	string	f	\N	50	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b53725c5-d122-4a73-8770-455b01b5bed8	b3a6e082-a566-40ae-ab77-a69430e75bc6	AID	AID	date	f	\N	\N	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
cdaad879-aa53-4745-8fc8-93f7a463eb4f	b3a6e082-a566-40ae-ab77-a69430e75bc6	ITD	ITD	date	f	\N	\N	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
e05ed670-61a4-490f-9e2d-e0885101cda4	b3a6e082-a566-40ae-ab77-a69430e75bc6	vin	VIN	string	f	\N	\N	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3cefb938-429d-4501-acc6-d08ce892d0da	b3a6e082-a566-40ae-ab77-a69430e75bc6	reg_expiration	Registration Expiration	date	f	\N	\N	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9ec5a9e6-1669-42d4-8f48-9024fa3e8ba4	b3a6e082-a566-40ae-ab77-a69430e75bc6	inspection_exp	Inspection Expiration	date	f	\N	\N	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
09fd96f4-8243-40b1-9087-550305bb3b30	b3a6e082-a566-40ae-ab77-a69430e75bc6	hut_exp	HUT Expiration	date	f	\N	\N	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
066c2a7c-3ccf-4113-b1bc-d48049a86fe4	b3a6e082-a566-40ae-ab77-a69430e75bc6	annual_inspection	Annual Inspection	date	f	\N	\N	13	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0cabc8a3-9620-4d48-bed8-50f8e6d3553d	b3a6e082-a566-40ae-ab77-a69430e75bc6	bobtail_insurance	Bobtail Insurance	date	f	\N	\N	14	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
42ec4990-cc8a-47fb-a2a8-1ac616505247	b3a6e082-a566-40ae-ab77-a69430e75bc6	diesel_emission	Diesel Emission	date	f	\N	\N	15	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b282c5d6-0d1a-4ab6-88f4-161ff68005bb	b3a6e082-a566-40ae-ab77-a69430e75bc6	fleetTruckOwner	Truck Owner	string	f	\N	100	16	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0349b22e-0110-4a28-aecf-f03e3dae669f	b3a6e082-a566-40ae-ab77-a69430e75bc6	newTerminal	Branch	string	f	\N	100	17	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
dc89e0ad-c600-45e1-b8f8-6c5508081528	befdf04f-9729-4dd1-a846-7884473dc616	firstName	First Name*	string	t	2	50	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8ebdc233-e62e-46dd-a15c-4e1b8ca62ce9	befdf04f-9729-4dd1-a846-7884473dc616	lastName	Last Name*	string	t	2	50	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d1bf3f57-550e-494c-a15d-d83e6c7ce8cc	befdf04f-9729-4dd1-a846-7884473dc616	mobile	Phone	string	f	\N	\N	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2e690ef1-5402-4f7a-b41c-2cda1c19fd77	befdf04f-9729-4dd1-a846-7884473dc616	email	Email*	string	t	\N	\N	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
646d20be-2c0d-439c-ba09-1c6254c1d590	befdf04f-9729-4dd1-a846-7884473dc616	password	Password*	string	t	10	50	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c2c3884e-6a0f-45ff-b873-174d3b2af493	befdf04f-9729-4dd1-a846-7884473dc616	role	System Roles*	string	t	\N	200	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7a4ff7cb-a017-4aca-94dd-cff48bfd4b49	befdf04f-9729-4dd1-a846-7884473dc616	terminals	Terminal*	string	t	\N	100	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5cc6dfcf-724d-4e89-aacb-82f76b3df3b4	befdf04f-9729-4dd1-a846-7884473dc616	customRole	Custom Role	string	t	\N	100	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
cb02dbc8-90ce-41f2-9e41-eb9b5dcb221d	240dad78-08be-4833-b7ca-b38c5a1df71e	name	Charge Profile Name	string	t	2	100	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6c58108f-775a-4439-867c-922e66d94f7a	240dad78-08be-4833-b7ca-b38c5a1df71e	chargeName	Charge Name	string	t	2	100	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7f62e96f-53c7-49dc-9630-1b45f9d29d71	240dad78-08be-4833-b7ca-b38c5a1df71e	description	Charge Description	string	f	\N	500	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
e73580b4-225f-4e82-b5b5-da1ba76addfe	240dad78-08be-4833-b7ca-b38c5a1df71e	unitOfMeasure	Unit of Measure	string	t	\N	50	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a51bec19-bccc-455b-ba9a-557639ab4481	240dad78-08be-4833-b7ca-b38c5a1df71e	effectiveDateBasedOn	Effective date based on	string	f	\N	50	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
094f88e4-e958-4658-8609-7e2d9a91ae5b	240dad78-08be-4833-b7ca-b38c5a1df71e	effectiveStartDate	Charge Effective Start Date	date	f	\N	\N	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
19413d88-8b7b-4bd1-b97b-fa5912d05824	240dad78-08be-4833-b7ca-b38c5a1df71e	effectiveEndDate	Charge Effective End Date	date	f	\N	\N	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
36997b5f-0fd7-4b9a-97d1-6e0c00bb29b2	240dad78-08be-4833-b7ca-b38c5a1df71e	autoAdd	Auto Add	string	f	\N	\N	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4c40159e-bc4a-4de9-bfa5-7d663deddd43	240dad78-08be-4833-b7ca-b38c5a1df71e	driverGroup	Driver Pay Group	string	f	\N	\N	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f2c4471a-b5ee-42db-924b-1ded00467e7c	240dad78-08be-4833-b7ca-b38c5a1df71e	vendorGroup	Vendor / Vendor Group	string	f	\N	\N	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4dd8e87e-8cbd-4518-a31b-61de455edf6d	240dad78-08be-4833-b7ca-b38c5a1df71e	fromEvent	Calculate From This	string	f	\N	200	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a70d071d-d1a1-45a9-9bb4-c33cf8cc71b1	240dad78-08be-4833-b7ca-b38c5a1df71e	toEvent	Calculate To This	string	f	\N	200	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
31fb797e-45d3-4273-b5fc-8f3467c77aa9	240dad78-08be-4833-b7ca-b38c5a1df71e	inEvent	Calculate In This Event	string	f	\N	200	13	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
12bee58d-8e24-4232-b7e7-e494dd0ec145	240dad78-08be-4833-b7ca-b38c5a1df71e	Calculate For Exact Events	Calculate For Exact Events	string	f	\N	\N	14	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1b233e3c-dcfe-4d43-ba58-b18fb5681e94	240dad78-08be-4833-b7ca-b38c5a1df71e	fromLegs	From Legs	string	f	\N	\N	15	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
be6cfb3f-29c8-49c9-a66f-0dfe65283df9	240dad78-08be-4833-b7ca-b38c5a1df71e	toLegs	To Legs	string	f	\N	\N	16	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1bc6587e-7e65-4e96-aeb3-1850e16d331d	240dad78-08be-4833-b7ca-b38c5a1df71e	fromLegEventLocation	From Leg Event Location	string	f	\N	200	17	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1bb66ba8-6ad8-4430-9021-51cb10e53b31	240dad78-08be-4833-b7ca-b38c5a1df71e	toLegEventLocation	To Leg Event Location	string	f	\N	200	18	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ab2745b1-ca51-4661-9304-468dca8c03e4	240dad78-08be-4833-b7ca-b38c5a1df71e	Zip Code Rule (any in)	Zip Code Rule (any in)	string	f	\N	500	19	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4053c95d-fa43-4e1c-bab5-18d3b16ad81c	240dad78-08be-4833-b7ca-b38c5a1df71e	Zip Code Rule (not in)	Zip Code Rule (not in)	string	f	\N	500	20	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
45ac444d-f92a-4af1-a814-745db6676c21	240dad78-08be-4833-b7ca-b38c5a1df71e	Load Type Rule (any in)	Load Type Rule (any in)	string	f	\N	200	21	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
579818e7-b388-4498-a383-335949ce47e7	240dad78-08be-4833-b7ca-b38c5a1df71e	Load Type Rule (not in)	Load Type Rule (not in)	string	f	\N	200	22	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1a680111-c758-445c-a4d4-7eeee6d865e2	240dad78-08be-4833-b7ca-b38c5a1df71e	City State Rule (any in)	City State Rule (any in)	string	f	\N	500	23	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7f45b409-5ef2-415d-9ded-e48b126349f1	240dad78-08be-4833-b7ca-b38c5a1df71e	minimumAmount	Minimum Amount	number	f	\N	\N	24	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9d79dbae-8e08-4475-9222-67f84c432659	240dad78-08be-4833-b7ca-b38c5a1df71e	freeUnits	Free Units	number	f	\N	\N	25	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
64fbb792-ccb6-44f2-8486-11629793958a	240dad78-08be-4833-b7ca-b38c5a1df71e	amount	Amount	number	f	\N	\N	26	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
91a79955-58d6-4895-aadf-a812fb821fa8	240dad78-08be-4833-b7ca-b38c5a1df71e	radiusRateType	Radius Rate	string	f	\N	\N	27	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
933e9dd3-2964-412a-8c98-7055ecc70718	240dad78-08be-4833-b7ca-b38c5a1df71e	startValue	Start Distance	number	f	\N	\N	28	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
706323ae-4082-48f6-9dde-f3288dcc41d8	240dad78-08be-4833-b7ca-b38c5a1df71e	endValue	End Distance	number	f	\N	\N	29	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f234f053-a365-4b91-a15a-312825b6beae	240dad78-08be-4833-b7ca-b38c5a1df71e	ifEvent	If Event	string	f	\N	\N	30	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c6f45cb6-83af-4d7e-ab9a-1d6146aec5ad	240dad78-08be-4833-b7ca-b38c5a1df71e	eventLocation	Event Location	string	f	\N	\N	31	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5393d3e2-0c2d-4a0a-9e54-a6b43cfbd73e	240dad78-08be-4833-b7ca-b38c5a1df71e	eventTime	Event Time	string	f	\N	\N	32	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
56ff74ca-068b-47ab-b6a8-4ac21904f34d	240dad78-08be-4833-b7ca-b38c5a1df71e	City State Rule (not in)	City State Rule (not in)	string	f	\N	500	33	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
60f36eae-46ce-4173-93c3-2c26d7f02d81	240dad78-08be-4833-b7ca-b38c5a1df71e	Customer(any in)	Customer(any in)	string	f	\N	\N	34	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a7520c2b-c747-426a-8b3f-91fffba8eb9d	240dad78-08be-4833-b7ca-b38c5a1df71e	Customer(not in)	Customer(not in)	string	f	\N	\N	35	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
094122bd-92f6-444c-af1c-f5c96a6f9028	240dad78-08be-4833-b7ca-b38c5a1df71e	Warehouse(any in)	Warehouse(any in)	string	f	\N	\N	36	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
684432bb-42d0-45c0-b8d2-0e0c29700e31	240dad78-08be-4833-b7ca-b38c5a1df71e	Warehouse(not in)	Warehouse(not in)	string	f	\N	\N	37	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
da023f06-637d-4885-a0cb-21e34004c8c7	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Pick Up(any in)	Chassis Pick Up(any in)	string	f	\N	\N	38	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7f5fc972-5040-4f79-81a5-6970c9cd54c2	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Pick Up(not in)	Chassis Pick Up(not in)	string	f	\N	\N	39	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
35cdebdd-80c9-4592-a14c-4049f1fc0b2f	240dad78-08be-4833-b7ca-b38c5a1df71e	Container Return(any in)	Container Return(any in)	string	f	\N	\N	40	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d7b2fde9-ee87-4010-923f-3c0469ffa392	240dad78-08be-4833-b7ca-b38c5a1df71e	Container Return(not in)	Container Return(not in)	string	f	\N	\N	41	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c1db2351-2f04-44de-9aab-dbb5fe20e1f0	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Term(any in)	Chassis Term(any in)	string	f	\N	\N	42	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
517c1e28-537b-419c-9852-1fbc08b801bd	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Term(not in)	Chassis Term(not in)	string	f	\N	\N	43	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6093a9fa-1d72-44b7-b4c7-7d7de73b3166	240dad78-08be-4833-b7ca-b38c5a1df71e	Container Type(any in)	Container Type(any in)	string	f	\N	\N	44	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4e525a96-fe7d-4b52-8f34-acee9415c4ac	240dad78-08be-4833-b7ca-b38c5a1df71e	Container Type(not in)	Container Type(not in)	string	f	\N	\N	45	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
33fdf599-531a-4fcd-a21e-1f973de211a5	240dad78-08be-4833-b7ca-b38c5a1df71e	Container Size(any in)	Container Size(any in)	string	f	\N	\N	46	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8dcdf3df-6b70-4b42-b37a-d7e6cca7d285	240dad78-08be-4833-b7ca-b38c5a1df71e	Container Size(not in)	Container Size(not in)	string	f	\N	\N	47	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6df757ee-d2d5-4059-964e-49937f080c43	240dad78-08be-4833-b7ca-b38c5a1df71e	Container Owner(any in)	Container Owner(any in)	string	f	\N	\N	48	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
146b37cc-aeef-4bb4-8d10-7936b0166b83	240dad78-08be-4833-b7ca-b38c5a1df71e	Container Owner(not in)	Container Owner(not in)	string	f	\N	\N	49	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
925b90c4-bddb-4517-ac98-4e6a7aee031e	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Type(any in)	Chassis Type(any in)	string	f	\N	\N	50	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5d78e478-edf0-429c-934b-77676a54cd88	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Type(not in)	Chassis Type(not in)	string	f	\N	\N	51	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1616539b-36ec-4eb6-8fb1-0b5265698553	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Size(any in)	Chassis Size(any in)	string	f	\N	\N	52	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a57bc51d-fe01-4b24-8549-955584aa0b2b	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Size(not in)	Chassis Size(not in)	string	f	\N	\N	53	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d59bba6a-663c-4d9c-b0c6-6e0e7dc38a10	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Owner(any in)	Chassis Owner(any in)	string	f	\N	\N	54	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b9d9dae9-30a6-4a84-9129-052996493162	240dad78-08be-4833-b7ca-b38c5a1df71e	Chassis Owner(not in)	Chassis Owner(not in)	string	f	\N	\N	55	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a1022039-cbd0-4eb8-b4bb-aa26da60f949	240dad78-08be-4833-b7ca-b38c5a1df71e	Branch(any in)	Branch(any in)	string	f	\N	\N	56	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9d07fab0-9f1f-4d44-bf24-d58ef7134129	240dad78-08be-4833-b7ca-b38c5a1df71e	Branch(not in)	Branch(not in)	string	f	\N	\N	57	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
bb23fdfa-157d-4212-9780-35b0cce4f384	240dad78-08be-4833-b7ca-b38c5a1df71e	Commodity(any in)	Commodity(any in)	string	f	\N	\N	58	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5c05158a-f736-46d7-9dcf-7999a2e82808	240dad78-08be-4833-b7ca-b38c5a1df71e	Commodity(not in)	Commodity(not in)	string	f	\N	\N	59	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
051369a8-6816-42cf-9b3c-73a45e2c6cc8	240dad78-08be-4833-b7ca-b38c5a1df71e	Hot(any in)	Hot(any in)	string	f	\N	\N	60	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
eb63fc57-6cf9-4344-aa6d-f1fb6a5b89ae	240dad78-08be-4833-b7ca-b38c5a1df71e	Hot(not in)	Hot(not in)	string	f	\N	\N	61	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
19ba0ac8-473f-44ff-9969-ae7603929866	240dad78-08be-4833-b7ca-b38c5a1df71e	Hazmat(any in)	Hazmat(any in)	string	f	\N	\N	62	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4538c8bd-ce31-437f-aaea-9b48b60f8b2e	240dad78-08be-4833-b7ca-b38c5a1df71e	Hazmat(not in)	Hazmat(not in)	string	f	\N	\N	63	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
fdff66ce-8455-46b6-b6a8-de8893493e85	240dad78-08be-4833-b7ca-b38c5a1df71e	Temperature(any in)	Temperature(any in)	string	f	\N	500	64	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
97416124-25af-4cd0-a019-17549bc14465	240dad78-08be-4833-b7ca-b38c5a1df71e	Temperature(not in)	Temperature(not in)	string	f	\N	500	65	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a09096b2-0584-44ed-ac8f-5b10bb45add4	240dad78-08be-4833-b7ca-b38c5a1df71e	Reefer(any in)	Reefer(any in)	number	f	\N	\N	66	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1cccd743-d29a-4c70-836d-369a45316900	240dad78-08be-4833-b7ca-b38c5a1df71e	Reefer(not in)	Reefer(not in)	number	f	\N	\N	67	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f3e51c7f-d0c2-462b-936e-869ec9fa80ef	240dad78-08be-4833-b7ca-b38c5a1df71e	Liquor(any in)	Liquor(any in)	string	f	\N	\N	68	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2e1162c5-d387-4144-9ce9-6ca70c9a9a87	240dad78-08be-4833-b7ca-b38c5a1df71e	Liquor(not in)	Liquor(not in)	string	f	\N	\N	69	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ea4a466b-521d-4a81-bace-dec63166b040	240dad78-08be-4833-b7ca-b38c5a1df71e	City-State(any in)	City-State(any in)	string	f	\N	500	70	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
71049436-4375-4301-af06-0559a90a226b	240dad78-08be-4833-b7ca-b38c5a1df71e	City-State(not in)	City-State(not in)	string	f	\N	500	71	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
420f619e-ced9-4678-964d-9fd1be432344	240dad78-08be-4833-b7ca-b38c5a1df71e	State(any in)	State(any in)	string	f	\N	\N	72	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6ee9191d-96fe-451b-83c1-9d53fd14c784	240dad78-08be-4833-b7ca-b38c5a1df71e	State(not in)	State(not in)	string	f	\N	\N	73	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a36e3dec-1128-4ac4-9aed-9905c6b01bff	240dad78-08be-4833-b7ca-b38c5a1df71e	Delivery Day(any in)	Delivery Day(any in)	string	f	\N	\N	74	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
be213ee6-5c68-4471-b5f2-6fc0add86511	240dad78-08be-4833-b7ca-b38c5a1df71e	Delivery Day(not in)	Delivery Day(not in)	string	f	\N	\N	75	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c0caf9a5-5446-4576-b675-2ddbc56d3d57	240dad78-08be-4833-b7ca-b38c5a1df71e	Delivery Time(any in)	Delivery Time(any in)	string	f	\N	\N	76	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c6a46118-a86c-4dd3-93e1-7756906825b7	240dad78-08be-4833-b7ca-b38c5a1df71e	Delivery Time(not in)	Delivery Time(not in)	string	f	\N	\N	77	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
e8d43782-7773-4468-8bae-d8c54a8876a6	240dad78-08be-4833-b7ca-b38c5a1df71e	City Groups(any in)	City Groups(any in)	string	f	\N	\N	78	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2b581d8c-78aa-4dea-b1fb-c04f1d3f8f7a	240dad78-08be-4833-b7ca-b38c5a1df71e	City Groups(not in)	City Groups(not in)	string	f	\N	\N	79	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0c6472d9-be93-4421-b3af-ba4ba962f9fa	240dad78-08be-4833-b7ca-b38c5a1df71e	Overweight(any in)	Overweight(any in)	string	f	\N	\N	80	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b3a2e7d3-1c61-45d7-b164-1518cf2230f7	240dad78-08be-4833-b7ca-b38c5a1df71e	Overweight(not in)	Overweight(not in)	string	f	\N	\N	81	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
81b386a3-2eeb-4f57-98fa-de2949ac81cb	240dad78-08be-4833-b7ca-b38c5a1df71e	Overheight(any in)	Overheight(any in)	string	f	\N	\N	82	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
64683f00-2a65-41a1-917f-c7b0539b0866	240dad78-08be-4833-b7ca-b38c5a1df71e	Overheight(not in)	Overheight(not in)	string	f	\N	\N	83	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1eb11084-dab8-4158-929f-946d6f92a489	240dad78-08be-4833-b7ca-b38c5a1df71e	Drop Location(any in)	Drop Location(any in)	string	f	\N	\N	84	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ee8880eb-2722-4abb-8be6-5cbd8c373182	240dad78-08be-4833-b7ca-b38c5a1df71e	Drop Location(not in)	Drop Location(not in)	string	f	\N	\N	85	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
414d0e18-982e-46d2-b829-0afc0a76188a	240dad78-08be-4833-b7ca-b38c5a1df71e	Dropped(any in)	Dropped(any in)	string	f	\N	\N	86	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
00c8103d-951f-4231-845c-eec62fd040d9	240dad78-08be-4833-b7ca-b38c5a1df71e	Dropped(not in)	Dropped(not in)	string	f	\N	\N	87	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
61574373-d80b-451b-beef-aed19b17f8ef	240dad78-08be-4833-b7ca-b38c5a1df71e	Genset(any in)	Genset(any in)	string	f	\N	\N	88	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3ab2ffff-fbe5-478e-ba6d-af0fcf4f8f27	240dad78-08be-4833-b7ca-b38c5a1df71e	Genset(not in)	Genset(not in)	string	f	\N	\N	89	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b36962e4-a102-42a6-8bbf-c122130ffb7c	240dad78-08be-4833-b7ca-b38c5a1df71e	CSR(any in)	CSR(any in)	string	f	\N	\N	90	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a6436d3e-206d-48bf-938e-90fab2e2623b	240dad78-08be-4833-b7ca-b38c5a1df71e	CSR(not in)	CSR(not in)	string	f	\N	\N	91	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ecd20990-031c-4253-93a2-e16bbc13829c	240dad78-08be-4833-b7ca-b38c5a1df71e	Stop Off(any in)	Stop Off(any in)	string	f	\N	500	92	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
e928b546-6c35-448a-b91e-99dcf055cd2c	240dad78-08be-4833-b7ca-b38c5a1df71e	Stop Off(not in)	Stop Off(not in)	string	f	\N	500	93	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f555e29f-ef7e-488f-a969-0213ccb09b16	240dad78-08be-4833-b7ca-b38c5a1df71e	Delivery Country(any in)	Delivery Country(any in)	string	f	\N	\N	94	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1bf6abcd-9ec7-4b00-b571-56089999f92b	240dad78-08be-4833-b7ca-b38c5a1df71e	Delivery Country(not in)	Delivery Country(not in)	string	f	\N	\N	95	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
bbb5255d-d243-42f5-b08c-2246bab6bd09	240dad78-08be-4833-b7ca-b38c5a1df71e	Postal/Zip Code Groups(any in)	Postal/Zip Code Groups(any in)	string	f	\N	\N	96	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6950f3ba-d520-4cc1-825d-be4c4c6d0633	240dad78-08be-4833-b7ca-b38c5a1df71e	Postal/Zip Code Groups(not in)	Postal/Zip Code Groups(not in)	string	f	\N	\N	97	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9640be5f-76a3-45cc-8c4a-a22eb7b281c6	240dad78-08be-4833-b7ca-b38c5a1df71e	Street Turn Type(any in)	Street Turn Type(any in)	string	f	\N	\N	98	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
fb3cdf1e-aa7b-470d-b05d-bc0869960aaf	240dad78-08be-4833-b7ca-b38c5a1df71e	Street Turn Type(not in)	Street Turn Type(not in)	string	f	\N	\N	99	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1d520129-8751-4541-8929-1e1c4a8a4e29	240dad78-08be-4833-b7ca-b38c5a1df71e	Trip Type(any in)	Trip Type(any in)	string	f	\N	\N	100	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
cd6ea45b-5693-430b-8c39-a2c7aa9c9a95	240dad78-08be-4833-b7ca-b38c5a1df71e	Trip Type(not in)	Trip Type(not in)	string	f	\N	\N	101	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9c09c3b9-2919-43e4-abb0-a25ccba50b62	240dad78-08be-4833-b7ca-b38c5a1df71e	Scale(any in)	Scale(any in)	string	f	\N	\N	102	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
04a5726d-8ba8-42bb-b8f5-b9b097146f38	240dad78-08be-4833-b7ca-b38c5a1df71e	Scale(not in)	Scale(not in)	string	f	\N	\N	103	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
78bc7288-61d7-44b3-9a1a-8a5a9c9cb7f0	240dad78-08be-4833-b7ca-b38c5a1df71e	Dual Transaction(any in)	Dual Transaction(any in)	string	f	\N	\N	104	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
508c10b8-242a-420f-9452-1546db3ff981	240dad78-08be-4833-b7ca-b38c5a1df71e	Dual Transaction(not in)	Dual Transaction(not in)	string	f	\N	\N	105	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d2e19da6-9aa5-4bad-a76b-6b13d140e7e3	240dad78-08be-4833-b7ca-b38c5a1df71e	Street Turn(any in)	Street Turn(any in)	string	f	\N	\N	106	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
bd8dc71a-9f73-41b2-be57-d301fa4deb90	240dad78-08be-4833-b7ca-b38c5a1df71e	Street Turn(not in)	Street Turn(not in)	string	f	\N	\N	107	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6fc450fa-8db8-41fd-b21d-883ad9bf230c	240dad78-08be-4833-b7ca-b38c5a1df71e	EV(any in)	EV(any in)	string	f	\N	\N	108	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4c27385c-d2f9-4172-9286-9dfda71cbc2f	240dad78-08be-4833-b7ca-b38c5a1df71e	EV(not in)	EV(not in)	string	f	\N	\N	109	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
a1aea2f8-24b2-41f5-a928-67f9c702bd55	240dad78-08be-4833-b7ca-b38c5a1df71e	Bonded(any in)	Bonded(any in)	string	f	\N	\N	110	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b40ac9b7-19b0-4bf3-bd61-802572cd9ef4	240dad78-08be-4833-b7ca-b38c5a1df71e	Bonded(not in)	Bonded(not in)	string	f	\N	\N	111	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7897185a-8c50-49c6-8192-a70ba0da5b08	240dad78-08be-4833-b7ca-b38c5a1df71e	OOG(any in)	OOG(any in)	string	f	\N	\N	112	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6f9deea7-df13-47b0-922e-c41532de689d	240dad78-08be-4833-b7ca-b38c5a1df71e	OOG(not in)	OOG(not in)	string	f	\N	\N	113	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
36d3d5f2-4a2b-4f5d-9fa2-c04b2d87453d	240dad78-08be-4833-b7ca-b38c5a1df71e	vendorType	Vendor	string	f	\N	\N	114	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7a23b92d-30f4-4e25-80b7-b5128b177cba	ab231e05-cda9-44d0-b237-64b6d9c5d807	contact_name	Contact Name	string	t	2	100	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b3fbbdde-0324-496e-981d-6cba995cca46	ab231e05-cda9-44d0-b237-64b6d9c5d807	mobile	Phone	string	t	\N	\N	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f29bf624-67e1-4a14-b255-a702ffc9c410	ab231e05-cda9-44d0-b237-64b6d9c5d807	address	Address	string	t	5	200	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ec72a68e-a701-4a2b-ad0c-57f9054f2c74	ab231e05-cda9-44d0-b237-64b6d9c5d807	city	City	string	t	2	50	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
56d51ef2-9947-4fd0-968e-f01441486fe5	ab231e05-cda9-44d0-b237-64b6d9c5d807	state	State	string	t	2	50	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
96650fec-3bc8-4610-9f26-de00991d71fc	ab231e05-cda9-44d0-b237-64b6d9c5d807	zip_code	Zip Code	string	t	\N	\N	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3657b1d2-181a-4915-88c5-762f6e293977	ab231e05-cda9-44d0-b237-64b6d9c5d807	country	Country	string	t	2	100	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
361d3750-55c6-40c9-a878-7bdcaa0851c2	9c9059a0-591f-4a92-837c-e901579b2082	chassisNo	Chassis #	string	t	1	50	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
20e18499-8d88-437b-8614-1994961e78c1	9c9059a0-591f-4a92-837c-e901579b2082	chassisType	Chassis Type	string	t	2	50	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
73b0974f-be40-43e7-a4d2-93ab2e251dbb	9c9059a0-591f-4a92-837c-e901579b2082	chassisSize	Chassis Size	string	t	2	100	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
16691a7a-db0f-4e6f-8879-054dced14803	9c9059a0-591f-4a92-837c-e901579b2082	chassisOwner	Chassis Owner	string	t	2	100	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5770fb86-fcdc-4407-a33d-7e7858787018	9c9059a0-591f-4a92-837c-e901579b2082	year	Year	string	f	\N	\N	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c8604f9c-af58-42e4-a50d-dcb2d18f3542	9c9059a0-591f-4a92-837c-e901579b2082	make	Make	string	f	\N	50	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
e23d9771-9d45-423d-a8a2-e72e47f84b85	9c9059a0-591f-4a92-837c-e901579b2082	model	Model	string	f	\N	50	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3eba25b0-d09d-41a3-905c-942360340a72	9c9059a0-591f-4a92-837c-e901579b2082	AID	Annual Inspection Date	date	f	\N	\N	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
dc551fe3-d880-40ec-a9d7-ca4f27f474af	9c9059a0-591f-4a92-837c-e901579b2082	ITD	ITD	date	f	\N	\N	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c2a367ce-8795-4563-83a4-f977e3373198	9c9059a0-591f-4a92-837c-e901579b2082	newTerminal	Branch	string	f	\N	100	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
354beefb-fe31-4d87-b8cb-648495c0f5fe	9c9059a0-591f-4a92-837c-e901579b2082	licenceState	License State	string	f	\N	\N	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
89acc0d7-3405-4d5c-b9fa-5f24357d8d4e	9c9059a0-591f-4a92-837c-e901579b2082	licenceNumber	License Number	string	f	\N	\N	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9a937492-5ca1-4ef3-9643-4fa3622f60ed	9c9059a0-591f-4a92-837c-e901579b2082	vin	VIN	string	f	\N	\N	13	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f8959bc1-7813-41b7-905f-8ccfa321f1a5	9c9059a0-591f-4a92-837c-e901579b2082	registration	Registration	date	f	\N	\N	14	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
929f9f11-9714-49ea-9094-cfcd71a629fb	9c9059a0-591f-4a92-837c-e901579b2082	inspection	Inspection	date	f	\N	\N	15	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ff4f2378-a885-4826-9f14-9847bee776ff	9c9059a0-591f-4a92-837c-e901579b2082	insurance	Insurance	date	f	\N	\N	16	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0e622c86-225b-4774-b624-b760d352ad5c	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	email	Email	string	t	\N	\N	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
dec1dca8-00e9-4589-9ce6-4f3d3754854d	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	firstName	First Name	string	t	2	50	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c8df71dc-dbd6-497c-8b44-c6e8acc8cbff	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	lastName	Last Name	string	t	2	50	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
95214dcc-8970-4a58-9544-1b5814c4628a	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	mobileNumbers	Mobile	string	t	\N	\N	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0a5a7245-620d-4e0e-a490-0f31f624c5c1	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	CustomerID	Customer ID	string	t	2	100	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
aa1b1c79-ae03-4fbf-9864-c5da04405a4d	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	password	Password	string	t	10	50	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
690c9a35-e9e3-46f9-8bd2-3a2498c8bfd9	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_employee_load	Loads Permission	boolean	f	\N	\N	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6091ef64-699a-433e-8026-c71f282046d7	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	dropped_containers	Dropped Containers Permission	boolean	f	\N	\N	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
fd7e43a9-0cae-4f65-80e2-8bb4ff5a86bd	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	account_payable	Account Payable Permission	boolean	f	\N	\N	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6fe05452-7db6-472e-8c87-03a1ca2474bc	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_employee_load_info	Info Permission	boolean	f	\N	\N	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
dd5f27a4-0cdf-42cb-9618-75741960d153	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_employee_load_billing	Billing Permission	boolean	f	\N	\N	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
21984293-6683-4708-a9f3-66cc74a00b63	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_employee_load_documents	Documents Permission	boolean	f	\N	\N	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
df19b9fc-155a-488a-91c2-0a48f1362440	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_employee_load_upload_documents	Upload Documents Permission	boolean	f	\N	\N	13	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
e821bfcd-9fb5-4208-95ff-728c83834b1d	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_employee_load_payments	Payments Permission	boolean	f	\N	\N	14	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
92dc2d9c-38b8-4c2e-a24d-0719d77e0cdb	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_employee_load_tracking	Tracking Permission	boolean	f	\N	\N	15	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
08b62f02-3931-4667-b8f2-7e4a5e9eada0	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_employee_load_messaging	Service Messaging Permission	boolean	f	\N	\N	16	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c87b7fe6-5fc9-4996-8acc-e736c090eb88	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_employee_load_summary	Summary Permission	boolean	f	\N	\N	17	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8b7e868f-8910-42f9-b97d-0076e7cd329e	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer_shipments	Shipment Tracking Permission	boolean	f	\N	\N	18	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0b26ace9-460a-4d37-b630-2818b76ba5d7	70d881e8-3d4a-47ae-9a49-0cc30a32a6bd	customer	Customer Permission	boolean	f	\N	\N	19	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
246ba319-04fc-415b-baad-6ad0ca88ba35	488e2572-2211-4d4e-bb7b-d76e35f235ac	company_name	Company Name	string	t	2	100	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
72264775-c72a-40d5-a06f-b1be7a01b2eb	488e2572-2211-4d4e-bb7b-d76e35f235ac	address	Address	string	t	5	200	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
935f4538-34af-47b1-b826-414d2a5f0eb4	488e2572-2211-4d4e-bb7b-d76e35f235ac	Building/Stuite	Building/Stuite	string	f	5	200	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
18e2b395-1eaf-46ad-8709-c92d5ac80ebd	488e2572-2211-4d4e-bb7b-d76e35f235ac	city	City	string	t	2	50	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
c5b6748e-c6b8-45a4-ac9d-e2ba6a044ec2	488e2572-2211-4d4e-bb7b-d76e35f235ac	state	State	string	t	\N	\N	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3cc46617-5f7a-4338-81b7-c7e952d8f841	488e2572-2211-4d4e-bb7b-d76e35f235ac	country	Country	string	t	\N	\N	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
e015262a-67b1-43e8-a6da-b0f5c67736cd	488e2572-2211-4d4e-bb7b-d76e35f235ac	zip_code	Zip Code	string	t	\N	\N	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
11724e45-9cfa-4619-9341-bf703b3abaef	488e2572-2211-4d4e-bb7b-d76e35f235ac	main_contact_name	Main Contact Name	string	f	2	100	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5a251733-2fce-4821-a159-a52210889e0b	488e2572-2211-4d4e-bb7b-d76e35f235ac	secondary_contact_name	Secondary Contact Name	string	f	2	100	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
eaa09b1a-f036-4a5d-99ae-ba06cc0fa775	488e2572-2211-4d4e-bb7b-d76e35f235ac	secondaryPhoneNo	Secondary Phone	string	f	\N	\N	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
aee4c425-def6-4359-8279-83ea0e4cee1e	488e2572-2211-4d4e-bb7b-d76e35f235ac	mobile	Mobile	string	f	\N	\N	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
66e4d05d-1feb-4694-91ab-383d86ad859a	488e2572-2211-4d4e-bb7b-d76e35f235ac	email	Email	string	f	\N	\N	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
055ce007-271a-4eab-aea3-a5286ca53465	488e2572-2211-4d4e-bb7b-d76e35f235ac	billingEmail	Billing Email	string	f	\N	\N	13	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4625a160-903f-4ef6-abe7-1aff48c12255	488e2572-2211-4d4e-bb7b-d76e35f235ac	password	Password	string	f	10	50	14	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
88137fc2-a60e-45ba-af12-330b8bf8d13f	488e2572-2211-4d4e-bb7b-d76e35f235ac	defaultPaymentTerms.paymentTermsMethod	Payment Terms Method	string	f	\N	50	15	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
95a008a5-1a3d-418c-8603-485030dc98ae	488e2572-2211-4d4e-bb7b-d76e35f235ac	defaultPaymentTerms.day	Payment Terms + Days	number	f	\N	\N	16	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ae666cec-0bde-43b5-8e34-e5f59a7c4afd	488e2572-2211-4d4e-bb7b-d76e35f235ac	credit_limit	Credit Limit	number	f	\N	\N	17	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6b6a7e4f-f080-4ab6-88b6-8a5c6416e67e	488e2572-2211-4d4e-bb7b-d76e35f235ac	branch	Branch	string	f	\N	\N	18	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d4cb6077-7bea-4364-a265-c8708e13fa29	488e2572-2211-4d4e-bb7b-d76e35f235ac	customerType	Organization Type	string	t	\N	\N	19	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1fb00d93-deb6-4177-87e0-955f25f8bf77	488e2572-2211-4d4e-bb7b-d76e35f235ac	receiverEmail	Receiver email	string	f	\N	\N	20	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0aa4c072-26a0-40ec-baa7-666155ea306c	488e2572-2211-4d4e-bb7b-d76e35f235ac	mcNumber	Mc number	string	f	\N	\N	21	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
28352d79-c8d5-431d-b8b2-dae8e3b4b7fb	488e2572-2211-4d4e-bb7b-d76e35f235ac	fleetCustomer	Fleet customer	string	f	\N	\N	22	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7ab93ea3-e9c2-422e-b64b-5250c2182873	488e2572-2211-4d4e-bb7b-d76e35f235ac	payType	Pay type	string	f	\N	50	23	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
59952a0f-bb33-44f0-acdd-42286609632f	488e2572-2211-4d4e-bb7b-d76e35f235ac	invoiceCurrencyWithCarrier	Currency Type	string	f	\N	\N	24	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7fd17bb1-5b2a-41e7-8a90-d93bd4281dee	488e2572-2211-4d4e-bb7b-d76e35f235ac	externalId	External ID	string	f	\N	\N	25	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6de5d6dc-eb55-4f27-834c-776ed42351b8	488e2572-2211-4d4e-bb7b-d76e35f235ac	latitude	Latitude	number	f	\N	\N	26	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ad702c0d-67c1-4aed-9dc5-cfdfc522e9b3	488e2572-2211-4d4e-bb7b-d76e35f235ac	longitude	Longitude	number	f	\N	\N	27	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f5349a15-d08a-493a-8c6c-1becdbddf2e2	488e2572-2211-4d4e-bb7b-d76e35f235ac	notes	notes	string	f	\N	\N	28	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3a2bfda6-411a-4c15-970a-9dc45dbcc03c	488e2572-2211-4d4e-bb7b-d76e35f235ac	officeHoursStart	Office Hour Start	time	f	\N	\N	29	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
67a6db88-fbfd-44be-839f-77320f4090f9	488e2572-2211-4d4e-bb7b-d76e35f235ac	officeHoursEnd	Office Hour End	time	f	\N	\N	30	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
46eb7ffe-c9c0-4768-ac6e-cd4ed88a8178	112a935c-8566-4bab-8ecf-aeff6950322e	name	First Name	string	t	2	50	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8242b46b-0785-4077-95fb-765bfd5bdc4f	112a935c-8566-4bab-8ecf-aeff6950322e	lastName	Last Name	string	t	2	50	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3bc129ee-2878-4db8-a935-fe631cc7ff28	112a935c-8566-4bab-8ecf-aeff6950322e	email	Email	string	t	7	50	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5a6096af-cd33-40ca-bc5a-900222618a1b	112a935c-8566-4bab-8ecf-aeff6950322e	mobile	Phone	string	t	\N	\N	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
f071a478-4393-4595-be1d-e7e90317b16f	112a935c-8566-4bab-8ecf-aeff6950322e	password	Password	string	t	5	20	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8e781db2-0776-4022-9bb2-4608d3dca9b3	112a935c-8566-4bab-8ecf-aeff6950322e	username	Username	string	f	3	50	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
976a3b51-2018-475e-b967-8f9af3d066f2	112a935c-8566-4bab-8ecf-aeff6950322e	truck	Truck Number	string	f	\N	50	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
eedef660-d2c6-441d-9d86-2ce2862b7d4e	112a935c-8566-4bab-8ecf-aeff6950322e	country_code	Country Code	string	f	\N	\N	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b5c45bdf-f75c-4da4-a6bc-0726b20e294c	112a935c-8566-4bab-8ecf-aeff6950322e	licence	License State	string	f	\N	\N	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8525a208-5e76-44f5-abd1-57efbfd2ba37	112a935c-8566-4bab-8ecf-aeff6950322e	licenceNumber	License Number	string	f	\N	\N	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
0f9fa0ab-eaa9-48c5-b843-a830aba33ce1	112a935c-8566-4bab-8ecf-aeff6950322e	seaLinkNumber	Sealink #	string	f	\N	\N	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
ecc45d98-b632-452c-a015-8fdc132a525f	112a935c-8566-4bab-8ecf-aeff6950322e	EmergencyContactName	Emergency Contact Name	string	f	\N	100	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3cda512e-ab9c-4373-82aa-08d0a6d3ca74	112a935c-8566-4bab-8ecf-aeff6950322e	EmergencyRelation	Emergency Relation	string	f	\N	50	13	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9a88efdd-5b96-4cf2-9af2-f2eb33be8a8f	112a935c-8566-4bab-8ecf-aeff6950322e	EmergencyContactNumber	Emergency Contact Number	string	f	\N	\N	14	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
b2beabd3-84bc-4336-8d44-bb1d3702a80d	112a935c-8566-4bab-8ecf-aeff6950322e	socialSecurity	Social Security #	string	f	\N	\N	15	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
68372c17-b23d-4a7c-b5e1-bae7a85b3bda	112a935c-8566-4bab-8ecf-aeff6950322e	billingEmail	Billing Email	string	f	\N	\N	16	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5718e280-1841-49c0-818d-d5508e9db302	112a935c-8566-4bab-8ecf-aeff6950322e	profileType	Profile Type	array	f	\N	\N	17	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
1d6974ea-b767-4dc3-af49-5f7ec259955c	112a935c-8566-4bab-8ecf-aeff6950322e	dlExp	License Expiration	date	f	\N	\N	18	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4923cad2-07e2-413b-bbc9-8de3fdb220df	112a935c-8566-4bab-8ecf-aeff6950322e	dob	Date of Birth	date	f	\N	\N	19	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
175ef8de-95a3-46ca-b1fb-258f1bbda4e1	112a935c-8566-4bab-8ecf-aeff6950322e	doh	Date of Hire	date	f	\N	\N	20	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
bb0825ea-043a-4e50-ad17-b142d02a5eb1	112a935c-8566-4bab-8ecf-aeff6950322e	medicalExp	Medical Expiration	date	f	\N	\N	21	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
34959d53-522d-4fbd-941c-3b1b4779479e	112a935c-8566-4bab-8ecf-aeff6950322e	twicExp	Twic Expiration	date	f	\N	\N	22	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
3d1935a4-2247-40ca-8302-37f02848b7c1	112a935c-8566-4bab-8ecf-aeff6950322e	seaLinkExp	Sea Link Expiration	date	f	\N	\N	23	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
961b83dd-0635-4b3c-a9e1-7bebe65cea2c	112a935c-8566-4bab-8ecf-aeff6950322e	branch	Branch	string	f	\N	100	24	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
4314f118-2972-4d45-811e-72cd24fd0db5	112a935c-8566-4bab-8ecf-aeff6950322e	externalSystemID	External Id	string	f	\N	\N	25	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
e00b54a3-7f4a-4a7c-b11d-c66303080e75	112a935c-8566-4bab-8ecf-aeff6950322e	hazmat	Hazmat	boolean	f	\N	\N	26	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
d6e2a9bc-306c-4f4d-84de-17baaf2f691e	112a935c-8566-4bab-8ecf-aeff6950322e	homeTerminalTimezone	Home Branch Time Zone	string	f	\N	100	27	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2154d879-2b6b-4dcd-850b-d44fc8271175	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Customers	Customers	string	f	\N	100	1	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
e3d99b67-3cdf-467e-bcc9-564fb56af0a5	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Owner	Owner	string	t	\N	100	2	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5be07de6-fe62-4041-ae2f-87e9b9a62d1a	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Size	Size	string	f	\N	10	3	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
17f31cef-ab39-4602-97f0-3491bb1e65e3	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Type	Type	string	t	\N	10	4	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
2a5298d9-d1e4-45fb-a9fc-96edbd955e68	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Tier #1	Tier #1	string	f	\N	50	5	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
9ecbbc0b-1b9b-4914-a18f-6d3880db5d16	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Tier #2	Tier #2	string	f	\N	50	6	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
7561a6e0-7fdb-4e22-9450-b0c7113e6b8e	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Tier #3	Tier #3	string	f	\N	50	7	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
afd1680f-003b-422a-9dcb-f2915739da1c	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Tier #4	Tier #4	string	f	\N	50	8	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
5c0696b1-42e5-4a43-bd9a-2781cb674d25	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Import Freedays	Import Freedays	string	f	\N	50	9	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
18091dcf-ec7b-41cb-af5d-87c96eae0e3f	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Export Freedays	Export Freedays	string	f	\N	50	10	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
8441bd53-3513-4d83-b231-1d8a3203a360	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Holiday	Holiday	string	f	\N	10	11	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
6492fc80-8aa6-42b9-92c1-d97ea99a4166	ab03bcbe-fb0a-423b-acc7-190cce2ae91e	Free Weekday	Free Weekday	string	f	\N	10	12	2025-09-25 21:29:46.58097+00	2025-09-25 21:29:46.58097+00
cddfeb11-1d34-4058-81f6-2b0dc36020ce	ab231e05-cda9-44d0-b237-64b6d9c5d807	company_name	Company Name	string	t	2	100	0	2025-09-25 21:29:46.58097+00	2025-09-25 22:40:15.566706+00
\.


--
-- Data for Name: entity_validations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.entity_validations (id, entity_field_id, validation_type, pattern, enum_values, lookup_id, lookup_field, error_message, is_active, created_at, updated_at) FROM stdin;
2719d559-74fe-41c3-a331-a0ba11dc8d0d	d19d26c2-9e91-4baa-ad2d-f14f157c4eb5	regex	^[A-Za-z0-9\\s]+$	\N	\N	\N	Company name must contain only letters, numbers, and spaces	t	2025-09-26 01:17:16.445917+00	2025-09-26 01:17:16.445917+00
20e80882-4f72-42fc-b37c-99a3a3fe5fb9	744ca506-1c76-4baf-8fb4-48e7786485af	regex	^[A-Za-z0-9\\s,.-]+$	\N	\N	\N	Shipper name contains invalid characters	t	2025-09-26 01:20:41.972505+00	2025-09-26 01:20:41.972505+00
7013918b-2ed9-4f90-b44f-b976311c091e	2deed160-51c3-4799-bf8d-507632e257ba	enum	\N	["Import", "Export", "Road"]	\N	\N	Load type must be Import, Export, or Road	t	2025-09-26 01:20:41.977255+00	2025-09-26 01:20:41.977255+00
051b5c96-2519-4531-bae3-5715b1720b53	bb7d31bf-2eb6-460e-a79c-c6ea3ae4cae7	lookup	\N	\N	branches	branch_name	Consignee must be a valid branch	t	2025-09-26 01:20:41.980415+00	2025-09-26 01:20:41.980415+00
03f82980-9f92-47f4-b269-c93dd52fd8f3	44bc2461-fc34-420f-a6b7-745a4cf16347	lookup	\N	\N	tmsCustomers	company_name	Customer must be a valid tmsCustomers entry	t	2025-09-26 01:26:01.867663+00	2025-09-26 01:26:01.867663+00
6b43cf76-0bfd-4d60-9a5b-78cd6bf01cec	da211b15-a184-45cf-8089-e9f2128beac2	lookup	\N	\N	containerSizes	name	Container Size must be a valid containerSizes entry	t	2025-09-26 01:26:01.896331+00	2025-09-26 01:26:01.896331+00
a0cbf9f0-f0d4-429e-b115-0c9c30a3a2b0	ef55ecf7-2522-4f93-8644-f49b55da0388	lookup	\N	\N	containerTypes	name	Container Type must be a valid containerTypes entry	t	2025-09-26 01:26:01.898013+00	2025-09-26 01:26:01.898013+00
d9262fea-d4da-4b54-9d08-7e2d936af1dc	8f43a713-9fc6-4c5b-b01f-b1ec447846ce	lookup	\N	\N	containerOwners	name	Owner must be a valid containerOwners entry	t	2025-09-26 01:26:01.899093+00	2025-09-26 01:26:01.899093+00
00b3fbdc-d566-45ef-a1d4-4f8927d2e6c6	59f7d2fe-b6d9-436b-a5a8-b74a1481483e	lookup	\N	\N	tmsCustomers	company_name	Container Return must be a valid tmsCustomers entry	t	2025-09-26 01:26:01.899583+00	2025-09-26 01:26:01.899583+00
773a70f2-bca4-4636-8ad6-ac473cb97bff	1a967d26-b966-4a62-8c10-0459a0dd8d9f	lookup	\N	\N	tmsCustomers	company_name	Hook Chassis Location must be a valid tmsCustomers entry	t	2025-09-26 01:26:01.900132+00	2025-09-26 01:26:01.900132+00
b83c1e3f-1ba6-4ddb-a110-d701de8d6343	40bcc89c-f5d1-48b9-b2c9-d3257007b4d6	lookup	\N	\N	tmsCustomers	company_name	Terminate Chassis Location must be a valid tmsCustomers entry	t	2025-09-26 01:26:01.900506+00	2025-09-26 01:26:01.900506+00
fe32e1a3-0610-4064-8c4a-5184532d444e	7b6f9047-913e-40f9-ae20-ebd61b1d6618	lookup	\N	\N	chassis	chassis_no	Chassis # must be a valid chassis entry	t	2025-09-26 01:26:01.900874+00	2025-09-26 01:26:01.900874+00
e14f730f-d077-45c8-8652-02a645755f20	377e2088-1490-468f-b139-85539541afc9	lookup	\N	\N	chassisOwners	name	Chassis Owner must be a valid chassisOwners entry	t	2025-09-26 01:26:01.901205+00	2025-09-26 01:26:01.901205+00
a4efe9eb-e1ec-4f60-ada9-d4c0cf867897	6c2f6002-edb5-4928-b15b-20676398e3e0	lookup	\N	\N	chassisSizes	name	Chassis Size must be a valid chassisSizes entry	t	2025-09-26 01:26:01.901557+00	2025-09-26 01:26:01.901557+00
dd47aac4-aa71-4064-bc1a-65b8e94bb704	6e594950-a341-47f1-860b-d27c59512a21	lookup	\N	\N	chassisTypes	name	Chassis Type must be a valid chassisTypes entry	t	2025-09-26 01:26:01.902163+00	2025-09-26 01:26:01.902163+00
8ab26e80-58cb-4089-a136-4ab0e7b9de66	57b5fadb-0c4b-474d-8321-760fa756ba77	lookup	\N	\N	branches	name	Branch must be a valid branches entry	t	2025-09-26 01:26:01.902499+00	2025-09-26 01:26:01.902499+00
af770902-20fe-4b5e-97ab-11dbabd2d90f	76200153-a680-4086-8954-95d571906c6d	lookup	\N	\N	commodities	name	Commodity must be a valid commodities entry	t	2025-09-26 01:26:01.902849+00	2025-09-26 01:26:01.902849+00
7e4abc1c-d4b8-4ef2-bee0-12d47f3cb0fb	0457def1-c71f-488e-8b8a-5062b341d90c	enum	\N	["true", "false"]	\N	\N	Hazmat must be one of: true, false	t	2025-09-26 01:26:01.903159+00	2025-09-26 01:26:01.903159+00
6c096691-b683-4ded-bf3a-9b0f598a9a3f	912282ab-999a-4f00-8360-9784c3582e48	enum	\N	["true", "false"]	\N	\N	Hot must be one of: true, false	t	2025-09-26 01:26:01.903493+00	2025-09-26 01:26:01.903493+00
bce93757-8705-4b35-b8a4-d8f2bac0e4ff	6b4f0cdf-f29f-4be7-b0de-8ecfebbac312	enum	\N	["true", "false"]	\N	\N	Overweight must be one of: true, false	t	2025-09-26 01:26:01.903875+00	2025-09-26 01:26:01.903875+00
cdc1e582-2f4f-439f-a7aa-12678c7121ca	443ad4eb-a17b-4162-b4b8-9d8401e78339	enum	\N	["Pick And Run + Live", "Pick And Run + Drop & Hook", "Prepull + Drop & Hook", "Prepull + Live", "One Way Move", "Pick And Run + Gray Pool", "Prepull + Gray Pool", "Shunt", "Pick and Lift + Deliver and Lift + Return", "Pick and Lift + Live"]	\N	\N	Routes must be one of: Pick And Run + Live, Pick And Run + Drop & Hook, Prepull + Drop & Hook, Prepull + Live, One Way Move, Pick And Run + Gray Pool, Prepull + Gray Pool, Shunt, Pick and Lift + Deliver and Lift + Return, Pick and Lift + Live	t	2025-09-26 01:26:01.904194+00	2025-09-26 01:26:01.904194+00
004efb9a-f604-4da9-9bc3-46ee149783c1	cdfa94ec-7fe7-4b17-93e8-c0ee8f6d26b6	enum	\N	["true", "false"]	\N	\N	Genset must be one of: true, false	t	2025-09-26 01:26:01.904484+00	2025-09-26 01:26:01.904484+00
95031459-ce88-4837-9d9d-a7d13dab9ec7	fb0aad5c-cc5b-4a9e-898c-b9183dfac4dc	enum	\N	["true", "false"]	\N	\N	Liquor must be one of: true, false	t	2025-09-26 01:26:01.904786+00	2025-09-26 01:26:01.904786+00
7f8e2ca7-7cb1-4376-913c-7562d11f4a2b	054e4c38-c352-4604-9a9a-2bdefc949a45	enum	\N	["true", "false"]	\N	\N	Overheight must be one of: true, false	t	2025-09-26 01:26:01.905088+00	2025-09-26 01:26:01.905088+00
0e0175bc-adce-4b85-b6a2-0c273999dcbc	2b669e71-82dc-4703-8b99-3d44d43d4199	enum	\N	["true", "false"]	\N	\N	Street Turn must be one of: true, false	t	2025-09-26 01:26:01.905376+00	2025-09-26 01:26:01.905376+00
636226a0-f5e2-4ef4-9819-d4c7873ee1be	269d29fa-339f-4447-9b78-57a271067214	enum	\N	["true", "false"]	\N	\N	Scale must be one of: true, false	t	2025-09-26 01:26:01.905653+00	2025-09-26 01:26:01.905653+00
df3c779c-6fa4-4d51-a649-cbb9fa498e79	f805a97f-97f2-40ff-aff4-5f375356d1de	regex	^[0-9]{4}$	\N	\N	\N	Invalid format for Year	t	2025-09-26 01:26:01.906511+00	2025-09-26 01:26:01.906511+00
ead09cf4-688a-45f5-a847-d0b855a24b01	9d26c976-adb3-4088-ab73-ca292840980a	regex	^[A-Z0-9]{9,17}$	\N	\N	\N	Invalid format for VIN	t	2025-09-26 01:26:01.907151+00	2025-09-26 01:26:01.907151+00
3641b1c9-40c0-4ffa-a3a8-355de9168463	82fa25a6-bd99-4096-b688-54fe3a60d87c	regex	^[A-Z]{2}$	\N	\N	\N	Invalid format for License Plate State	t	2025-09-26 01:26:01.907462+00	2025-09-26 01:26:01.907462+00
516a00c5-9518-4467-975d-03227e2534ca	0c62ed29-45c2-4bdd-b9fd-53800db32696	regex	^[A-Z0-9]{1,10}$	\N	\N	\N	Invalid format for License Plate #	t	2025-09-26 01:26:01.907775+00	2025-09-26 01:26:01.907775+00
757f9cea-7ada-47f0-b87d-99c1f3186434	23fc93db-3032-469d-a5e8-e365be4b716f	enum	\N	["Dry Van", "Reefer", "Flat Bed", "Drop Deck", "Low Boy", "Double Drop Deck"]	\N	\N	Trailer Type must be one of: Dry Van, Reefer, Flat Bed, Drop Deck, Low Boy, Double Drop Deck	t	2025-09-26 01:26:01.908061+00	2025-09-26 01:26:01.908061+00
cac2c833-9ace-4b0b-9516-2611bc3ec216	6ffec36c-84c9-4c55-b54a-c243f5191007	lookup	\N	\N	branches	name	Branch must be a valid branches entry	t	2025-09-26 01:26:01.911723+00	2025-09-26 01:26:01.911723+00
b4f08328-4b56-42bc-86d6-c5b9201e6f15	95ed7741-5640-456e-82ba-4164367cd7eb	regex	^[a-zA-Z0-9 ]*$	\N	\N	\N	Invalid format for MC #	t	2025-09-26 01:26:01.913023+00	2025-09-26 01:26:01.913023+00
3204ee31-7d46-4787-977f-750e865dfc12	930fd250-b880-40ec-b4b3-f5aa25f9c076	regex	^\\([0-9]{3}\\) [0-9]{3}-[0-9]{4}$	\N	\N	\N	Invalid format for Mobile	t	2025-09-26 01:26:01.913389+00	2025-09-26 01:26:01.913389+00
66897827-d20e-41c6-a95b-109f813b0ca5	92d68759-83a4-4cfd-8fce-64239772afc3	regex	^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\\.([a-zA-Z]{2,4})+$	\N	\N	\N	Invalid format for Email	t	2025-09-26 01:26:01.913746+00	2025-09-26 01:26:01.913746+00
d989041b-177c-4b72-a314-3fcdceb8644f	85b0eb09-7707-4ad3-858c-23dbd26b5b17	regex	^[A-Z]{2}$	\N	\N	\N	Invalid format for License State	t	2025-09-26 01:26:01.914075+00	2025-09-26 01:26:01.914075+00
823412ac-6d2f-47b7-a60f-3c6470da6417	b8a8ad13-d5e3-40cf-9fce-63f8858c4cdf	regex	^[A-Z0-9]{1,10}$	\N	\N	\N	Invalid format for License Plate #	t	2025-09-26 01:26:01.914368+00	2025-09-26 01:26:01.914368+00
3e1eca53-809b-475d-98b9-1e1cd2b050f7	60436197-33b2-4df7-8e18-49137023c32d	regex	^[0-9]{4}$	\N	\N	\N	Invalid format for Year	t	2025-09-26 01:26:01.914686+00	2025-09-26 01:26:01.914686+00
f64b283f-25f6-44fc-b869-41ae442f1dc4	b282c5d6-0d1a-4ab6-88f4-161ff68005bb	lookup	\N	\N	fleetOwners	company_name	Truck Owner must be a valid fleetOwners entry	t	2025-09-26 01:26:01.914974+00	2025-09-26 01:26:01.914974+00
d6dafa50-e632-4fc6-9500-679da30c63d2	0349b22e-0110-4a28-aecf-f03e3dae669f	lookup	\N	\N	branches	name	Branch must be a valid branches entry	t	2025-09-26 01:26:01.915724+00	2025-09-26 01:26:01.915724+00
f8ae81b8-330a-41fa-a1de-cdee055bd136	d1bf3f57-550e-494c-a15d-d83e6c7ce8cc	regex	^\\([0-9]{3}\\) [0-9]{3}-[0-9]{4}$	\N	\N	\N	Invalid format for Phone	t	2025-09-26 01:26:01.915994+00	2025-09-26 01:26:01.915994+00
681a5f42-2e80-4634-9c19-df43c1723615	2e690ef1-5402-4f7a-b41c-2cda1c19fd77	regex	^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\\.([a-zA-Z]{2,4})+$	\N	\N	\N	Invalid format for Email*	t	2025-09-26 01:26:01.916268+00	2025-09-26 01:26:01.916268+00
d945c5f9-b3c5-4360-b70a-d58ac2ef9ace	646d20be-2c0d-439c-ba09-1c6254c1d590	regex	^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{10,})	\N	\N	\N	Invalid format for Password*	t	2025-09-26 01:26:01.916554+00	2025-09-26 01:26:01.916554+00
e3873e04-4a9b-4ca4-8a51-834ef16ec8a4	c2c3884e-6a0f-45ff-b873-174d3b2af493	regex	^(?:\\s*(?:Admin|CSR|Sales\\sAgent|Mechanics)\\s*)(?:,\\s*(?:Admin|CSR|Sales\\sAgent|Mechanics)\\s*)*$	\N	\N	\N	Invalid format for System Roles*	t	2025-09-26 01:26:01.916819+00	2025-09-26 01:26:01.916819+00
8fa7dd35-85b4-41de-8784-51667d8c4350	7a4ff7cb-a017-4aca-94dd-cff48bfd4b49	lookup	\N	\N	branches	name	Terminal* must be a valid branches entry	t	2025-09-26 01:26:01.919029+00	2025-09-26 01:26:01.919029+00
3a8c7f26-4540-45b3-8815-b736192912ec	5cc6dfcf-724d-4e89-aacb-82f76b3df3b4	lookup	\N	\N	getAllPermissionRoles	roleName	Custom Role must be a valid getAllPermissionRoles entry	t	2025-09-26 01:26:01.919321+00	2025-09-26 01:26:01.919321+00
72d185ff-7a4e-4905-ba92-2216b6887c49	6c58108f-775a-4439-867c-922e66d94f7a	lookup	\N	\N	chargeCodes	value	Charge Name must be a valid chargeCodes entry	t	2025-09-26 01:26:01.919591+00	2025-09-26 01:26:01.919591+00
7a748e69-6f73-48a5-b38b-9b1e41319849	e73580b4-225f-4e82-b5b5-da1ba76addfe	enum	\N	["Per Kilograms", "Per Pounds", "Per Kilometers", "Per Miles", "Percentage", "Per Day", "Per Hour", "Per Road Toll", "Fixed", "Per 15min", "Per 30min", "Per 45min", "Radius Rate", "Compounding Radius Rate", "Per Move", "Percentage By Leg", "Percentage By Move", "Per Hour Blocks"]	\N	\N	Unit of Measure must be one of: Per Kilograms, Per Pounds, Per Kilometers, Per Miles, Percentage, Per Day, Per Hour, Per Road Toll, Fixed, Per 15min, Per 30min, Per 45min, Radius Rate, Compounding Radius Rate, Per Move, Percentage By Leg, Percentage By Move, Per Hour Blocks	t	2025-09-26 01:26:01.920809+00	2025-09-26 01:26:01.920809+00
94afcd10-f72d-4e63-94bc-a65e5c9f500c	a51bec19-bccc-455b-ba9a-557639ab4481	regex	^(CURRENT DATE|CREATED AT|MOVE START DATE|DEPARTED FROM CHASSIS|ARRIVED TO CHASSIS|ARRIVED AT PULL CONTAINER|DEPARTED FROM PULL CONTAINER|ARRIVED AT DELIVER LOAD|DEPARTED FROM DELIVER LOAD|ARRIVED AT DROP CONTAINER|DEPARTED FROM DROP CONTAINER|ARRIVED AT HOOK CONTAINER|DEPARTED FROM HOOK CONTAINER|ARRIVED AT RETURN CONTAINER|DEPARTED FROM RETURN CONTAINER|ARRIVED AT CHASSIS TERMINATION|DEPARTED FROM CHASSIS TERMINATION|ARRIVED AT STOP OFF|DEPARTED FROM STOP OFF|COMPLETED|PICKUP APT|DELIVERY APT|RETURN APT)$	\N	\N	\N	Invalid format for Effective date based on	t	2025-09-26 01:26:01.921112+00	2025-09-26 01:26:01.921112+00
054cff49-7182-4b8b-b681-e7e38357297a	4c40159e-bc4a-4de9-bfa5-7d663deddd43	lookup	\N	\N	driverGroups	name	Driver Pay Group must be a valid driverGroups entry	t	2025-09-26 01:26:01.922408+00	2025-09-26 01:26:01.922408+00
15ccaef0-2750-478e-ba56-a069278c3ca8	f2c4471a-b5ee-42db-924b-1ded00467e7c	lookup	\N	\N	carrierGroups	name	Vendor / Vendor Group must be a valid carrierGroups entry	t	2025-09-26 01:26:01.922703+00	2025-09-26 01:26:01.922703+00
20fe0073-3c1e-4f88-a483-cebdf7e1152f	1b233e3c-dcfe-4d43-ba58-b18fb5681e94	enum	\N	["Pick Up Container", "Deliver Container", "Return Container", "Drop Container", "Stop Off", "Terminate Chassis", "Completed", "Hook Container", "Lift Off", "Lift On", "Deliver Load - Drop & Hook", "Hook Chassis", "Drop Chassis"]	\N	\N	From Legs must be one of: Pick Up Container, Deliver Container, Return Container, Drop Container, Stop Off, Terminate Chassis, Completed, Hook Container, Lift Off, Lift On, Deliver Load - Drop & Hook, Hook Chassis, Drop Chassis	t	2025-09-26 01:26:01.947075+00	2025-09-26 01:26:01.947075+00
dd6aa6b5-71d0-44c4-bcfe-538316caacd1	be6cfb3f-29c8-49c9-a66f-0dfe65283df9	enum	\N	["Pick Up Container", "Deliver Container", "Return Container", "Drop Container", "Stop Off", "Terminate Chassis", "Completed", "Hook Container", "Lift Off", "Lift On", "Deliver Load - Drop & Hook", "Hook Chassis", "Drop Chassis"]	\N	\N	To Legs must be one of: Pick Up Container, Deliver Container, Return Container, Drop Container, Stop Off, Terminate Chassis, Completed, Hook Container, Lift Off, Lift On, Deliver Load - Drop & Hook, Hook Chassis, Drop Chassis	t	2025-09-26 01:26:01.948691+00	2025-09-26 01:26:01.948691+00
46041121-4cba-44cb-8a48-5a041c48542b	1bc6587e-7e65-4e96-aeb3-1850e16d331d	lookup	\N	\N	tmsCustomers	company_name	From Leg Event Location must be a valid tmsCustomers entry	t	2025-09-26 01:26:01.94911+00	2025-09-26 01:26:01.94911+00
c4b004f9-4688-43fe-8b88-823fc9834733	1bb66ba8-6ad8-4430-9021-51cb10e53b31	lookup	\N	\N	tmsCustomers	company_name	To Leg Event Location must be a valid tmsCustomers entry	t	2025-09-26 01:26:01.94946+00	2025-09-26 01:26:01.94946+00
b9323f18-17d8-4f94-bd08-c756fba4dfe2	91a79955-58d6-4895-aadf-a812fb821fa8	enum	\N	["fixed", "perUnit"]	\N	\N	Radius Rate must be one of: fixed, perUnit	t	2025-09-26 01:26:01.949791+00	2025-09-26 01:26:01.949791+00
37fa0657-85ac-4f41-bda0-04a2bf2a3eea	f234f053-a365-4b91-a15a-312825b6beae	enum	\N	["Pick Up Container", "Deliver Container", "Return Container", "Drop Container", "Stop Off", "Terminate Chassis", "Completed", "Hook Container", "Lift Off", "Lift On", "Deliver Load - Drop & Hook", "Hook Chassis", "Drop Chassis"]	\N	\N	If Event must be one of: Pick Up Container, Deliver Container, Return Container, Drop Container, Stop Off, Terminate Chassis, Completed, Hook Container, Lift Off, Lift On, Deliver Load - Drop & Hook, Hook Chassis, Drop Chassis	t	2025-09-26 01:26:01.950097+00	2025-09-26 01:26:01.950097+00
6893ac1b-06fb-4457-bd69-238de39f97f3	c6f45cb6-83af-4d7e-ab9a-1d6146aec5ad	lookup	\N	\N	tmsCustomers	company_name	Event Location must be a valid tmsCustomers entry	t	2025-09-26 01:26:01.950441+00	2025-09-26 01:26:01.950441+00
17d73ca4-ad6c-4c07-8b05-a5776f097cd0	5393d3e2-0c2d-4a0a-9e54-a6b43cfbd73e	regex	^Arrived|Departure$	\N	\N	\N	Invalid format for Event Time	t	2025-09-26 01:26:01.950782+00	2025-09-26 01:26:01.950782+00
4d1ddb92-3613-4138-a86b-72fcddd2d93f	60f36eae-46ce-4173-93c3-2c26d7f02d81	lookup	\N	\N	branches	name	Customer(any in) must be a valid branches entry	t	2025-09-26 01:26:01.951612+00	2025-09-26 01:26:01.951612+00
aae5344e-dfe6-454d-9b9b-b6ae749b63ab	a7520c2b-c747-426a-8b3f-91fffba8eb9d	lookup	\N	\N	branches	name	Customer(not in) must be a valid branches entry	t	2025-09-26 01:26:01.951919+00	2025-09-26 01:26:01.951919+00
f46cb91c-168d-470c-b830-7d1344d25eb9	094122bd-92f6-444c-af1c-f5c96a6f9028	lookup	\N	\N	branches	name	Warehouse(any in) must be a valid branches entry	t	2025-09-26 01:26:01.952215+00	2025-09-26 01:26:01.952215+00
dfe1be78-bfe8-4d68-a93d-e2a093f113ce	684432bb-42d0-45c0-b8d2-0e0c29700e31	lookup	\N	\N	branches	name	Warehouse(not in) must be a valid branches entry	t	2025-09-26 01:26:01.952498+00	2025-09-26 01:26:01.952498+00
20480c7a-b2e8-4dc3-aca4-eb7879e69bb9	da023f06-637d-4885-a0cb-21e34004c8c7	lookup	\N	\N	branches	name	Chassis Pick Up(any in) must be a valid branches entry	t	2025-09-26 01:26:01.952831+00	2025-09-26 01:26:01.952831+00
b2db2ebe-10b0-42f9-9a22-035c59849a33	7f5fc972-5040-4f79-81a5-6970c9cd54c2	lookup	\N	\N	branches	name	Chassis Pick Up(not in) must be a valid branches entry	t	2025-09-26 01:26:01.953118+00	2025-09-26 01:26:01.953118+00
d369dd69-b28e-4938-8c03-7c590c51271f	35cdebdd-80c9-4592-a14c-4049f1fc0b2f	lookup	\N	\N	branches	name	Container Return(any in) must be a valid branches entry	t	2025-09-26 01:26:01.953425+00	2025-09-26 01:26:01.953425+00
9f79c989-fbb1-43f8-8cd4-f46e658c3ed4	d7b2fde9-ee87-4010-923f-3c0469ffa392	lookup	\N	\N	branches	name	Container Return(not in) must be a valid branches entry	t	2025-09-26 01:26:01.953739+00	2025-09-26 01:26:01.953739+00
3c218874-3070-4c68-b9cf-47208da2631c	c1db2351-2f04-44de-9aab-dbb5fe20e1f0	lookup	\N	\N	branches	name	Chassis Term(any in) must be a valid branches entry	t	2025-09-26 01:26:01.954029+00	2025-09-26 01:26:01.954029+00
b16473c0-7c40-4042-8e32-f3e80af94046	517c1e28-537b-419c-9852-1fbc08b801bd	lookup	\N	\N	branches	name	Chassis Term(not in) must be a valid branches entry	t	2025-09-26 01:26:01.954298+00	2025-09-26 01:26:01.954298+00
04642d98-9045-4b0a-a507-ebf1c2ed1260	6093a9fa-1d72-44b7-b4c7-7d7de73b3166	lookup	\N	\N	containerTypes	name	Container Type(any in) must be a valid containerTypes entry	t	2025-09-26 01:26:01.954598+00	2025-09-26 01:26:01.954598+00
5f9621da-89d0-48ac-bc84-fb98397b93e6	4e525a96-fe7d-4b52-8f34-acee9415c4ac	lookup	\N	\N	containerTypes	name	Container Type(not in) must be a valid containerTypes entry	t	2025-09-26 01:26:01.9549+00	2025-09-26 01:26:01.9549+00
bc395ebf-da15-45c1-bc5d-a7d9e966d07f	33fdf599-531a-4fcd-a21e-1f973de211a5	lookup	\N	\N	containerSizes	name	Container Size(any in) must be a valid containerSizes entry	t	2025-09-26 01:26:01.95578+00	2025-09-26 01:26:01.95578+00
2dd5bea7-5b11-4076-b4a4-0efa6a6da72b	8dcdf3df-6b70-4b42-b37a-d7e6cca7d285	lookup	\N	\N	containerSizes	name	Container Size(not in) must be a valid containerSizes entry	t	2025-09-26 01:26:01.956053+00	2025-09-26 01:26:01.956053+00
edb6e66e-9ae0-4167-8853-3ecde907ffb8	6df757ee-d2d5-4059-964e-49937f080c43	lookup	\N	\N	containerOwners	name	Container Owner(any in) must be a valid containerOwners entry	t	2025-09-26 01:26:01.956329+00	2025-09-26 01:26:01.956329+00
aa02f045-763b-49cd-a5c2-f705c6a56e48	146b37cc-aeef-4bb4-8d10-7936b0166b83	lookup	\N	\N	containerOwners	name	Container Owner(not in) must be a valid containerOwners entry	t	2025-09-26 01:26:01.956603+00	2025-09-26 01:26:01.956603+00
1446d283-2d52-491c-8c82-49c040575867	925b90c4-bddb-4517-ac98-4e6a7aee031e	lookup	\N	\N	chassisTypes	name	Chassis Type(any in) must be a valid chassisTypes entry	t	2025-09-26 01:26:01.95688+00	2025-09-26 01:26:01.95688+00
718df13f-afe7-4956-bcfe-d7c252c1b2a5	5d78e478-edf0-429c-934b-77676a54cd88	lookup	\N	\N	chassisTypes	name	Chassis Type(not in) must be a valid chassisTypes entry	t	2025-09-26 01:26:01.957151+00	2025-09-26 01:26:01.957151+00
ac6d6533-45ee-4377-beea-1559d72da13c	1616539b-36ec-4eb6-8fb1-0b5265698553	lookup	\N	\N	chassisSizes	name	Chassis Size(any in) must be a valid chassisSizes entry	t	2025-09-26 01:26:01.957414+00	2025-09-26 01:26:01.957414+00
0faea760-d474-460e-97a6-0d4f9829c6cd	a57bc51d-fe01-4b24-8549-955584aa0b2b	lookup	\N	\N	chassisSizes	name	Chassis Size(not in) must be a valid chassisSizes entry	t	2025-09-26 01:26:01.958091+00	2025-09-26 01:26:01.958091+00
8509f2c2-aed3-41d0-9662-37e07c4ecd5a	d59bba6a-663c-4d9c-b0c6-6e0e7dc38a10	lookup	\N	\N	chassisOwners	name	Chassis Owner(any in) must be a valid chassisOwners entry	t	2025-09-26 01:26:01.9584+00	2025-09-26 01:26:01.9584+00
7ede7f87-c7fa-4921-a1a6-f8f1d5ff7753	b9d9dae9-30a6-4a84-9129-052996493162	lookup	\N	\N	chassisOwners	name	Chassis Owner(not in) must be a valid chassisOwners entry	t	2025-09-26 01:26:01.958675+00	2025-09-26 01:26:01.958675+00
4f2d2a3b-84a2-4866-a929-9cc8c5ad4136	a1022039-cbd0-4eb8-b4bb-aa26da60f949	lookup	\N	\N	branches	name	Branch(any in) must be a valid branches entry	t	2025-09-26 01:26:01.958946+00	2025-09-26 01:26:01.958946+00
39f0bc55-5527-496a-8325-a356fd62f19b	9d07fab0-9f1f-4d44-bf24-d58ef7134129	lookup	\N	\N	branches	name	Branch(not in) must be a valid branches entry	t	2025-09-26 01:26:01.959491+00	2025-09-26 01:26:01.959491+00
cd92fb63-2907-457c-a7e5-fd23f5e28ea7	bb23fdfa-157d-4212-9780-35b0cce4f384	lookup	\N	\N	commodities	name	Commodity(any in) must be a valid commodities entry	t	2025-09-26 01:26:01.959761+00	2025-09-26 01:26:01.959761+00
96345440-2135-485b-a338-1b37d9d9857d	5c05158a-f736-46d7-9dcf-7999a2e82808	lookup	\N	\N	commodities	name	Commodity(not in) must be a valid commodities entry	t	2025-09-26 01:26:01.960018+00	2025-09-26 01:26:01.960018+00
de198714-35e0-42d1-acfa-2d99e996a677	051369a8-6816-42cf-9b3c-73a45e2c6cc8	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Hot(any in)	t	2025-09-26 01:26:01.960277+00	2025-09-26 01:26:01.960277+00
c140c6f3-0a48-41f9-a2ad-957cd61d4e5a	eb63fc57-6cf9-4344-aa6d-f1fb6a5b89ae	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Hot(not in)	t	2025-09-26 01:26:01.960989+00	2025-09-26 01:26:01.960989+00
cc85ff10-db66-4dfd-8eee-56a447b42339	19ba0ac8-473f-44ff-9969-ae7603929866	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Hazmat(any in)	t	2025-09-26 01:26:01.961309+00	2025-09-26 01:26:01.961309+00
cd532ded-af5e-4414-ae51-8dd311327d99	4538c8bd-ce31-437f-aaea-9b48b60f8b2e	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Hazmat(not in)	t	2025-09-26 01:26:01.961586+00	2025-09-26 01:26:01.961586+00
c47ee2cf-d937-4800-b620-7dbceb858e3f	f3e51c7f-d0c2-462b-936e-869ec9fa80ef	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Liquor(any in)	t	2025-09-26 01:26:01.961852+00	2025-09-26 01:26:01.961852+00
11de97ab-a520-45a9-ba41-c8c426226fcc	2e1162c5-d387-4144-9ce9-6ca70c9a9a87	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Liquor(not in)	t	2025-09-26 01:26:01.96214+00	2025-09-26 01:26:01.96214+00
02b6efca-91e8-4d6d-a6c5-634dba91bead	420f619e-ced9-4678-964d-9fd1be432344	regex	^[A-Z]{2}(?:,\\s*[A-Z]{2})*$	\N	\N	\N	Invalid format for State(any in)	t	2025-09-26 01:26:01.96243+00	2025-09-26 01:26:01.96243+00
4a12a98b-24f1-4041-83f2-cca175f3b150	6ee9191d-96fe-451b-83c1-9d53fd14c784	regex	^[A-Z]{2}(?:,\\s*[A-Z]{2})*$	\N	\N	\N	Invalid format for State(not in)	t	2025-09-26 01:26:01.962769+00	2025-09-26 01:26:01.962769+00
7946470d-ca0f-452e-9afb-4e39e16315e5	a36e3dec-1128-4ac4-9aed-9905c6b01bff	regex	^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))*$	\N	\N	\N	Invalid format for Delivery Day(any in)	t	2025-09-26 01:26:01.963101+00	2025-09-26 01:26:01.963101+00
29ceabaf-101e-4611-83f0-6532db15b870	be213ee6-5c68-4471-b5f2-6fc0add86511	regex	^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,\\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday))*$	\N	\N	\N	Invalid format for Delivery Day(not in)	t	2025-09-26 01:26:01.963405+00	2025-09-26 01:26:01.963405+00
426a2daa-8a4f-4595-84a7-973551d55bca	c0caf9a5-5446-4576-b675-2ddbc56d3d57	regex	^([01]?[0-9]|2[0-3]):[0-5][0-9]$	\N	\N	\N	Invalid format for Delivery Time(any in)	t	2025-09-26 01:26:01.964594+00	2025-09-26 01:26:01.964594+00
dedd73a3-9b1d-4195-9f58-cc7e7f76608c	c6a46118-a86c-4dd3-93e1-7756906825b7	regex	^([01]?[0-9]|2[0-3]):[0-5][0-9]$	\N	\N	\N	Invalid format for Delivery Time(not in)	t	2025-09-26 01:26:01.964877+00	2025-09-26 01:26:01.964877+00
40966583-7797-47c0-8794-94ce07e8e105	e8d43782-7773-4468-8bae-d8c54a8876a6	lookup	\N	\N	cityGroups	name	City Groups(any in) must be a valid cityGroups entry	t	2025-09-26 01:26:01.965147+00	2025-09-26 01:26:01.965147+00
691a561e-7284-4caa-bac2-a76cca73140b	2b581d8c-78aa-4dea-b1fb-c04f1d3f8f7a	lookup	\N	\N	cityGroups	name	City Groups(not in) must be a valid cityGroups entry	t	2025-09-26 01:26:01.965427+00	2025-09-26 01:26:01.965427+00
1ff470a1-2a8a-421a-9d7a-19a985d007a6	0c6472d9-be93-4421-b3af-ba4ba962f9fa	enum	\N	["Yes", "No"]	\N	\N	Overweight(any in) must be one of: Yes, No	t	2025-09-26 01:26:01.965713+00	2025-09-26 01:26:01.965713+00
48d4445e-a3d1-4a51-979e-9e992c877828	b3a2e7d3-1c61-45d7-b164-1518cf2230f7	enum	\N	["Yes", "No"]	\N	\N	Overweight(not in) must be one of: Yes, No	t	2025-09-26 01:26:01.966003+00	2025-09-26 01:26:01.966003+00
f6987e11-e739-48a9-8b31-2a6d0520279f	81b386a3-2eeb-4f57-98fa-de2949ac81cb	enum	\N	["Yes", "No"]	\N	\N	Overheight(any in) must be one of: Yes, No	t	2025-09-26 01:26:01.966279+00	2025-09-26 01:26:01.966279+00
2ace0dfa-f800-4c91-bc6a-dc5d1b0ac40a	64683f00-2a65-41a1-917f-c7b0539b0866	enum	\N	["Yes", "No"]	\N	\N	Overheight(not in) must be one of: Yes, No	t	2025-09-26 01:26:01.966551+00	2025-09-26 01:26:01.966551+00
1a1ab4ef-f415-4d76-947c-a087e0bb55dc	1eb11084-dab8-4158-929f-946d6f92a489	lookup	\N	\N	branches	name	Drop Location(any in) must be a valid branches entry	t	2025-09-26 01:26:01.966841+00	2025-09-26 01:26:01.966841+00
812be428-ba07-45c6-89db-a35a0fae7db4	ee8880eb-2722-4abb-8be6-5cbd8c373182	lookup	\N	\N	branches	name	Drop Location(not in) must be a valid branches entry	t	2025-09-26 01:26:01.967113+00	2025-09-26 01:26:01.967113+00
7fc43a09-a772-4b37-9a2f-8de4941abc30	414d0e18-982e-46d2-b829-0afc0a76188a	regex	^(After Delivery|Before Delivery)(?:,\\s*(After Delivery|Before Delivery))*$	\N	\N	\N	Invalid format for Dropped(any in)	t	2025-09-26 01:26:01.967374+00	2025-09-26 01:26:01.967374+00
c2ce2838-3d67-49fe-8f76-f10adf8e9a34	00c8103d-951f-4231-845c-eec62fd040d9	regex	^(After Delivery|Before Delivery)(?:,\\s*(After Delivery|Before Delivery))*$	\N	\N	\N	Invalid format for Dropped(not in)	t	2025-09-26 01:26:01.967632+00	2025-09-26 01:26:01.967632+00
440bfbeb-fe07-462c-b9b2-df74036ee293	61574373-d80b-451b-beef-aed19b17f8ef	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Genset(any in)	t	2025-09-26 01:26:01.968663+00	2025-09-26 01:26:01.968663+00
3d468aa5-6cba-4b24-ba4f-81fdc7b4b7ab	3ab2ffff-fbe5-478e-ba6d-af0fcf4f8f27	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Genset(not in)	t	2025-09-26 01:26:01.96893+00	2025-09-26 01:26:01.96893+00
80c47afa-878c-49c5-82bc-d0f7db646425	b36962e4-a102-42a6-8bbf-c122130ffb7c	lookup	\N	\N	CSR	name	CSR(any in) must be a valid CSR entry	t	2025-09-26 01:26:01.969201+00	2025-09-26 01:26:01.969201+00
32149e09-1a56-4055-abe3-7c50d2dc2f11	a6436d3e-206d-48bf-938e-90fab2e2623b	lookup	\N	\N	CSR	name	CSR(not in) must be a valid CSR entry	t	2025-09-26 01:26:01.969464+00	2025-09-26 01:26:01.969464+00
ecff8d70-0202-4791-9505-82a2bae78404	f555e29f-ef7e-488f-a969-0213ccb09b16	regex	^[A-Z]{2}(?:,\\s*[A-Z]{2})*$	\N	\N	\N	Invalid format for Delivery Country(any in)	t	2025-09-26 01:26:01.969746+00	2025-09-26 01:26:01.969746+00
1799861d-89d2-49f5-bd30-a21879036d8e	1bf6abcd-9ec7-4b00-b571-56089999f92b	regex	^[A-Z]{2}(?:,\\s*[A-Z]{2})*$	\N	\N	\N	Invalid format for Delivery Country(not in)	t	2025-09-26 01:26:01.970026+00	2025-09-26 01:26:01.970026+00
8107ce6b-6321-4a56-8c7d-fdd4e5233e12	bbb5255d-d243-42f5-b08c-2246bab6bd09	lookup	\N	\N	zipCodeGroups	name	Postal/Zip Code Groups(any in) must be a valid zipCodeGroups entry	t	2025-09-26 01:26:01.970305+00	2025-09-26 01:26:01.970305+00
01f7f4a9-be7f-4edb-b162-1990b3752330	6950f3ba-d520-4cc1-825d-be4c4c6d0633	lookup	\N	\N	zipCodeGroups	name	Postal/Zip Code Groups(not in) must be a valid zipCodeGroups entry	t	2025-09-26 01:26:01.970577+00	2025-09-26 01:26:01.970577+00
f70cb9ee-bc4d-4f2f-89e9-a6cb5083683f	9640be5f-76a3-45cc-8c4a-a22eb7b281c6	regex	^(Commercial|Operational)(?:,\\s*(Commercial|Operational))*$	\N	\N	\N	Invalid format for Street Turn Type(any in)	t	2025-09-26 01:26:01.970873+00	2025-09-26 01:26:01.970873+00
f7fbd3a7-2959-4ac8-ae39-ebf030fec27d	fb3cdf1e-aa7b-470d-b05d-bc0869960aaf	regex	^(Commercial|Operational)(?:,\\s*(Commercial|Operational))*$	\N	\N	\N	Invalid format for Street Turn Type(not in)	t	2025-09-26 01:26:01.971143+00	2025-09-26 01:26:01.971143+00
bf34c780-ca88-4bd8-bcd3-37b2eec2942c	1d520129-8751-4541-8929-1e1c4a8a4e29	regex	^(Commercial|Operational)(?:,\\s*(Commercial|Operational))*$	\N	\N	\N	Invalid format for Trip Type(any in)	t	2025-09-26 01:26:01.971468+00	2025-09-26 01:26:01.971468+00
aade1449-0b8f-47de-9e91-d9e4ec5f5d6c	cd6ea45b-5693-430b-8c39-a2c7aa9c9a95	regex	^(Commercial|Operational)(?:,\\s*(Commercial|Operational))*$	\N	\N	\N	Invalid format for Trip Type(not in)	t	2025-09-26 01:26:01.971767+00	2025-09-26 01:26:01.971767+00
7cefc572-0575-41ae-b95b-b0ed62a928f7	9c09c3b9-2919-43e4-abb0-a25ccba50b62	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Scale(any in)	t	2025-09-26 01:26:01.972321+00	2025-09-26 01:26:01.972321+00
7d1c2053-5d43-40ed-9c62-ff576aec95e7	04a5726d-8ba8-42bb-b8f5-b9b097146f38	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Scale(not in)	t	2025-09-26 01:26:01.97376+00	2025-09-26 01:26:01.97376+00
9d5a8e70-1b1f-44c9-b338-d4ce755d9824	78bc7288-61d7-44b3-9a1a-8a5a9c9cb7f0	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Dual Transaction(any in)	t	2025-09-26 01:26:01.97409+00	2025-09-26 01:26:01.97409+00
3c92dfa2-3a3c-445f-b744-b9e0c197c0a2	508c10b8-242a-420f-9452-1546db3ff981	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Dual Transaction(not in)	t	2025-09-26 01:26:01.974366+00	2025-09-26 01:26:01.974366+00
a677461b-6719-40c9-a2ac-5667c30efe24	d2e19da6-9aa5-4bad-a76b-6b13d140e7e3	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Street Turn(any in)	t	2025-09-26 01:26:01.974667+00	2025-09-26 01:26:01.974667+00
2ccdce56-a028-41c7-9fb8-8c8ad93e6e99	bd8dc71a-9f73-41b2-be57-d301fa4deb90	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Street Turn(not in)	t	2025-09-26 01:26:01.974951+00	2025-09-26 01:26:01.974951+00
330fb6ec-71e8-418d-9012-bd3a0592a9e0	6fc450fa-8db8-41fd-b21d-883ad9bf230c	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for EV(any in)	t	2025-09-26 01:26:01.975233+00	2025-09-26 01:26:01.975233+00
89b8020c-2948-4a13-931d-32465fa5a69a	4c27385c-d2f9-4172-9286-9dfda71cbc2f	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for EV(not in)	t	2025-09-26 01:26:01.976132+00	2025-09-26 01:26:01.976132+00
dba5b218-40fb-4994-9c38-7e70368b6799	a1aea2f8-24b2-41f5-a928-67f9c702bd55	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Bonded(any in)	t	2025-09-26 01:26:01.976414+00	2025-09-26 01:26:01.976414+00
9cbeecf6-8921-4157-938c-be58a87079b7	b40ac9b7-19b0-4bf3-bd61-802572cd9ef4	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for Bonded(not in)	t	2025-09-26 01:26:01.976699+00	2025-09-26 01:26:01.976699+00
c6a41860-e543-4244-9e91-5ea99e21fddc	7897185a-8c50-49c6-8192-a70ba0da5b08	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for OOG(any in)	t	2025-09-26 01:26:01.976976+00	2025-09-26 01:26:01.976976+00
c10221bf-b879-4103-868c-66a4e47b0934	6f9deea7-df13-47b0-922e-c41532de689d	regex	^(Yes|No)(?:,\\s*(Yes|No))*$	\N	\N	\N	Invalid format for OOG(not in)	t	2025-09-26 01:26:01.977229+00	2025-09-26 01:26:01.977229+00
4109a428-7a6c-4b96-a790-eb6d5f241def	36d3d5f2-4a2b-4f5d-9fa2-c04b2d87453d	regex	^(Driver|Carrier)(?:,\\s*(Driver|Carrier))*$	\N	\N	\N	Invalid format for Vendor	t	2025-09-26 01:26:01.977502+00	2025-09-26 01:26:01.977502+00
9c41c08c-7b12-40da-b993-011d281cffa1	b3fbbdde-0324-496e-981d-6cba995cca46	regex	^\\([0-9]{3}\\) [0-9]{3}-[0-9]{4}$	\N	\N	\N	Invalid format for Phone	t	2025-09-26 01:26:01.977773+00	2025-09-26 01:26:01.977773+00
b0914c71-7a92-4dd8-b38a-a323a0eaa7e5	96650fec-3bc8-4610-9f26-de00991d71fc	regex	^[0-9]{5}(-[0-9]{4})?$	\N	\N	\N	Invalid format for Zip Code	t	2025-09-26 01:26:01.97856+00	2025-09-26 01:26:01.97856+00
e5996799-79c5-4953-a496-8c94a2c09fda	20e18499-8d88-437b-8614-1994961e78c1	lookup	\N	\N	chassisTypes	name	Chassis Type must be a valid chassisTypes entry	t	2025-09-26 01:26:01.978871+00	2025-09-26 01:26:01.978871+00
91b072c9-81cc-4d15-bd8e-9ca92a4b4df8	73b0974f-be40-43e7-a4d2-93ab2e251dbb	lookup	\N	\N	chassisSizes	name	Chassis Size must be a valid chassisSizes entry	t	2025-09-26 01:26:01.979161+00	2025-09-26 01:26:01.979161+00
d099f0d0-26ec-4985-8a4d-48ae49ef535d	16691a7a-db0f-4e6f-8879-054dced14803	lookup	\N	\N	chassisOwners	company_name	Chassis Owner must be a valid chassisOwners entry	t	2025-09-26 01:26:01.979465+00	2025-09-26 01:26:01.979465+00
fbc68470-517f-489f-bd62-06207dafb34e	5770fb86-fcdc-4407-a33d-7e7858787018	regex	^[0-9]{4}$	\N	\N	\N	Invalid format for Year	t	2025-09-26 01:26:01.979731+00	2025-09-26 01:26:01.979731+00
bae2ee9b-68d9-455c-ac4b-245442f90ff7	c2a367ce-8795-4563-83a4-f977e3373198	lookup	\N	\N	branches	name	Branch must be a valid branches entry	t	2025-09-26 01:26:01.979999+00	2025-09-26 01:26:01.979999+00
d1f9f4fd-05d9-4ba9-8664-71e39c5568fb	0e622c86-225b-4774-b624-b760d352ad5c	regex	^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\\.([a-zA-Z]{2,4})+$	\N	\N	\N	Invalid format for Email	t	2025-09-26 01:26:01.980319+00	2025-09-26 01:26:01.980319+00
34f020d1-1429-4f98-9f85-a0be59c08b09	95214dcc-8970-4a58-9544-1b5814c4628a	regex	^\\([0-9]{3}\\) [0-9]{3}-[0-9]{4}$	\N	\N	\N	Invalid format for Mobile	t	2025-09-26 01:26:01.980584+00	2025-09-26 01:26:01.980584+00
65aecef4-21f2-45a8-8cfd-0574627d26fb	0a5a7245-620d-4e0e-a490-0f31f624c5c1	lookup	\N	\N	tmsCustomers	company_name	Customer ID must be a valid tmsCustomers entry	t	2025-09-26 01:26:01.980862+00	2025-09-26 01:26:01.980862+00
00007c49-bfbb-4337-a90a-2f8a3ca40b07	aa1b1c79-ae03-4fbf-9864-c5da04405a4d	regex	^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{10,})	\N	\N	\N	Invalid format for Password	t	2025-09-26 01:26:01.981214+00	2025-09-26 01:26:01.981214+00
ceb48aa2-02df-42b6-8045-39b2a74d9ba9	3cc46617-5f7a-4338-81b7-c7e952d8f841	regex	^[A-Z]{2}$	\N	\N	\N	Invalid format for Country	t	2025-09-26 01:26:01.981523+00	2025-09-26 01:26:01.981523+00
cd5ab90b-9fba-49c6-9ede-bc1bdc0a3079	e015262a-67b1-43e8-a6da-b0f5c67736cd	regex	^(?=(.*\\d)).{2,}$	\N	\N	\N	Invalid format for Zip Code	t	2025-09-26 01:26:01.981813+00	2025-09-26 01:26:01.981813+00
08aba736-52a2-4af8-a9ba-74cf5acdbe49	eaa09b1a-f036-4a5d-99ae-ba06cc0fa775	regex	^(\\+?[1-9]{1}[0-9]{1,14}|\\(?\\d{1,4}\\)?[\\s\\-]?\\d{1,4}[\\s\\-]?\\d{1,4}[\\s\\-]?\\d{1,4})$	\N	\N	\N	Invalid format for Secondary Phone	t	2025-09-26 01:26:01.982565+00	2025-09-26 01:26:01.982565+00
2bfbe08c-5339-4b66-bc6a-5d6fb9b16ccd	aee4c425-def6-4359-8279-83ea0e4cee1e	regex	^(\\+?[1-9]{1}[0-9]{1,14}|\\(?\\d{1,4}\\)?[\\s\\-]?\\d{1,4}[\\s\\-]?\\d{1,4}[\\s\\-]?\\d{1,4})$	\N	\N	\N	Invalid format for Mobile	t	2025-09-26 01:26:01.982861+00	2025-09-26 01:26:01.982861+00
cd3fb99c-2437-48ab-b401-122de3d89507	66e4d05d-1feb-4694-91ab-383d86ad859a	regex	^([^@]+@[^@]+\\s*,\\s*)*[^@]+@[^@]+$	\N	\N	\N	Invalid format for Email	t	2025-09-26 01:26:01.983132+00	2025-09-26 01:26:01.983132+00
47a98563-3028-4354-971f-680719019583	055ce007-271a-4eab-aea3-a5286ca53465	regex	^([^@]+@[^@]+\\s*,\\s*)*[^@]+@[^@]+$	\N	\N	\N	Invalid format for Billing Email	t	2025-09-26 01:26:01.983412+00	2025-09-26 01:26:01.983412+00
b8c04df3-1c7f-4caf-9369-1d0110b71a4a	4625a160-903f-4ef6-abe7-1aff48c12255	regex	^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{10,})	\N	\N	\N	Invalid format for Password	t	2025-09-26 01:26:01.983701+00	2025-09-26 01:26:01.983701+00
923e3732-0d9c-4dc3-b00e-3b5363821176	6b6a7e4f-f080-4ab6-88b6-8a5c6416e67e	lookup	\N	\N	branches	name	Branch must be a valid branches entry	t	2025-09-26 01:26:01.983986+00	2025-09-26 01:26:01.983986+00
93ed2917-4568-4abc-98a8-fbedccbac447	d4cb6077-7bea-4364-a265-c8708e13fa29	enum	\N	["?:ALL", "CUSTOMER", "TERMINAL", "WAREHOUSE", "CONTAINERRETURN", "CHASSISPICK", "CHASSISTERMINATION"]	\N	\N	Organization Type must be one of: ?:ALL, CUSTOMER, TERMINAL, WAREHOUSE, CONTAINERRETURN, CHASSISPICK, CHASSISTERMINATION	t	2025-09-26 01:26:01.984258+00	2025-09-26 01:26:01.984258+00
f1e00584-c86b-4e21-88c2-fef5058b773e	1fb00d93-deb6-4177-87e0-955f25f8bf77	regex	^([^@]+@[^@]+\\s*,\\s*)*[^@]+@[^@]+$	\N	\N	\N	Invalid format for Receiver email	t	2025-09-26 01:26:01.984542+00	2025-09-26 01:26:01.984542+00
8081822f-33bc-4db6-9cca-b0393c5a68bf	0aa4c072-26a0-40ec-baa7-666155ea306c	regex	^.{2,}$	\N	\N	\N	Invalid format for Mc number	t	2025-09-26 01:26:01.984873+00	2025-09-26 01:26:01.984873+00
3d145eff-9be5-4634-a0d8-cdb194e22fe2	28352d79-c8d5-431d-b8b2-dae8e3b4b7fb	lookup	\N	\N	getTMSFleetCustomers	company_name	Fleet customer must be a valid getTMSFleetCustomers entry	t	2025-09-26 01:26:01.985149+00	2025-09-26 01:26:01.985149+00
1fc84bac-ea3c-427e-a31b-c27d807c29ec	59952a0f-bb33-44f0-acdd-42286609632f	regex	^[A-Z]{3}$	\N	\N	\N	Invalid format for Currency Type	t	2025-09-26 01:26:01.985416+00	2025-09-26 01:26:01.985416+00
6119ac34-6686-4e71-adcf-1f3b79f6220c	3bc129ee-2878-4db8-a935-fe631cc7ff28	regex	^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\\.([a-zA-Z]{2,4})+$	\N	\N	\N	Invalid format for Email	t	2025-09-26 01:26:01.990592+00	2025-09-26 01:26:01.990592+00
7b189458-9e02-45da-a6c1-0b8f93a35f87	5a6096af-cd33-40ca-bc5a-900222618a1b	regex	^\\d{3}-\\d{3}-\\d{4}$	\N	\N	\N	Invalid format for Phone	t	2025-09-26 01:26:01.990935+00	2025-09-26 01:26:01.990935+00
6e57e053-6e88-46b5-bef7-fae1e2243a8c	f071a478-4393-4595-be1d-e7e90317b16f	regex	^[A-Z]{3}\\d{5}\\*$	\N	\N	\N	Invalid format for Password	t	2025-09-26 01:26:01.991228+00	2025-09-26 01:26:01.991228+00
6152d7d5-3fbf-4c65-bb31-12f03823d3a4	8e781db2-0776-4022-9bb2-4608d3dca9b3	regex	^[a-z0-9]+$	\N	\N	\N	Invalid format for Username	t	2025-09-26 01:26:01.99151+00	2025-09-26 01:26:01.99151+00
5bef2d0c-040d-42f0-a8ed-45928ec8977d	976a3b51-2018-475e-b967-8f9af3d066f2	lookup	\N	\N	trucks	equipmentID	Truck Number must be a valid trucks entry	t	2025-09-26 01:26:01.992647+00	2025-09-26 01:26:01.992647+00
bc5b6c8d-e37b-4c75-a330-aa96d14ba2cd	eedef660-d2c6-441d-9d86-2ce2862b7d4e	regex	^[0-9]{1,3}$	\N	\N	\N	Invalid format for Country Code	t	2025-09-26 01:26:01.992967+00	2025-09-26 01:26:01.992967+00
5a1e2477-9907-4c18-ba21-9f852af32553	b5c45bdf-f75c-4da4-a6bc-0726b20e294c	regex	^[A-Za-z\\s]{2,50}$	\N	\N	\N	Invalid format for License State	t	2025-09-26 01:26:01.993254+00	2025-09-26 01:26:01.993254+00
b338eb61-49d4-40f3-b553-c3185b1ac870	8525a208-5e76-44f5-abd1-57efbfd2ba37	regex	^[A-Z0-9]{1,15}$	\N	\N	\N	Invalid format for License Number	t	2025-09-26 01:26:01.993563+00	2025-09-26 01:26:01.993563+00
0561a613-7e87-443f-b8e9-1644cc169921	0f9fa0ab-eaa9-48c5-b843-a830aba33ce1	regex	^[A-Z0-9]{1,20}$	\N	\N	\N	Invalid format for Sealink #	t	2025-09-26 01:26:01.993871+00	2025-09-26 01:26:01.993871+00
50120614-74f5-442b-9dc1-885d50e99898	9a88efdd-5b96-4cf2-9af2-f2eb33be8a8f	regex	^[0-9]{10}$	\N	\N	\N	Invalid format for Emergency Contact Number	t	2025-09-26 01:26:01.994143+00	2025-09-26 01:26:01.994143+00
5ec4458c-681c-46dd-8cc6-84c1d773d580	68372c17-b23d-4a7c-b5e1-bae7a85b3bda	regex	^[a-zA-Z0-9]([a-zA-Z0-9._-])*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-])*[a-zA-Z0-9]\\.([a-zA-Z]{2,4})+$	\N	\N	\N	Invalid format for Billing Email	t	2025-09-26 01:26:01.994426+00	2025-09-26 01:26:01.994426+00
547cbe69-7dd0-4a2c-aa5c-ba54294cd386	5718e280-1841-49c0-818d-d5508e9db302	lookup	\N	\N	driverProfileTypes	type	Profile Type must be a valid driverProfileTypes entry	t	2025-09-26 01:26:01.994719+00	2025-09-26 01:26:01.994719+00
1c708085-4b32-4aac-9f84-16b4b54b23fa	961b83dd-0635-4b3c-a9e1-7bebe65cea2c	lookup	\N	\N	branches	name	Branch must be a valid branches entry	t	2025-09-26 01:26:01.994992+00	2025-09-26 01:26:01.994992+00
0ec6d660-65a6-48f9-85bc-78b6d0db2806	4314f118-2972-4d45-811e-72cd24fd0db5	regex	^[0-9]+$	\N	\N	\N	Invalid format for External Id	t	2025-09-26 01:26:01.995272+00	2025-09-26 01:26:01.995272+00
ccdfc8c4-d4a1-4b84-acc0-ff8ff399475c	e00b54a3-7f4a-4a7c-b11d-c66303080e75	enum	\N	["True", "False", "T", "F", "Yes", "No"]	\N	\N	Hazmat must be one of: True, False, T, F, Yes, No	t	2025-09-26 01:26:01.995558+00	2025-09-26 01:26:01.995558+00
5f5020a1-7609-44d5-bba4-275a164d7981	d6e2a9bc-306c-4f4d-84de-17baaf2f691e	lookup	\N	\N	timezoneList	type	Home Branch Time Zone must be a valid timezoneList entry	t	2025-09-26 01:26:01.995842+00	2025-09-26 01:26:01.995842+00
ad4e9030-d79e-482b-9a2d-08292cabbc48	2154d879-2b6b-4dcd-850b-d44fc8271175	lookup	\N	\N	tmsCustomers	company_name	Customers must be a valid tmsCustomers entry	t	2025-09-26 01:26:01.996947+00	2025-09-26 01:26:01.996947+00
254d4392-f99f-4c52-8de2-54a5363651bf	e3d99b67-3cdf-467e-bcc9-564fb56af0a5	lookup	\N	\N	containerOwners	company_name	Owner must be a valid containerOwners entry	t	2025-09-26 01:26:01.997648+00	2025-09-26 01:26:01.997648+00
e7468eb7-36d2-4cfd-a5f6-1cb2865c99a5	5be07de6-fe62-4041-ae2f-87e9b9a62d1a	lookup	\N	\N	containerSizes	name	Size must be a valid containerSizes entry	t	2025-09-26 01:26:01.997952+00	2025-09-26 01:26:01.997952+00
a23795f9-7e14-46fa-b207-739b83fce23a	17f31cef-ab39-4602-97f0-3491bb1e65e3	lookup	\N	\N	containerTypes	name	Type must be a valid containerTypes entry	t	2025-09-26 01:26:01.998236+00	2025-09-26 01:26:01.998236+00
f13eba21-7559-480d-a206-8a52aaca19de	8441bd53-3513-4d83-b231-1d8a3203a360	enum	\N	["true", "false", "True", "False", "TRUE", "FALSE"]	\N	\N	Holiday must be one of: true, false, True, False, TRUE, FALSE	t	2025-09-26 01:26:01.998538+00	2025-09-26 01:26:01.998538+00
139b94d1-2c59-4121-96ee-f6479d7616c2	6492fc80-8aa6-42b9-92c1-d97ea99a4166	enum	\N	["true", "false", "True", "False", "TRUE", "FALSE"]	\N	\N	Free Weekday must be one of: true, false, True, False, TRUE, FALSE	t	2025-09-26 01:26:01.99882+00	2025-09-26 01:26:01.99882+00
63ef2c98-a002-4981-a4f3-6b83cba62c4d	7fd17bb1-5b2a-41e7-8a90-d93bd4281dee	regex	^[A-Za-z0-9!@#$%^&*()_+\\-=\\[\\]{}|;':",./<>?`~]+$	[]			Invalid format for External ID	t	2025-09-26 01:26:01.98882+00	2025-09-26 03:02:58.5798+00
b134bc97-6a5d-4c86-a945-9db92e8bee4e	36997b5f-0fd7-4b9a-97d1-6e0c00bb29b2	enum		["Yes", "No", "yes", "no"]			Auto Add must be one of: Yes, No	t	2025-09-26 01:26:01.921393+00	2025-09-26 04:43:19.222622+00
\.


--
-- Name: base_urls_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.base_urls_id_seq', 11, true);


--
-- Name: base_urls base_urls_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.base_urls
    ADD CONSTRAINT base_urls_name_key UNIQUE (name);


--
-- Name: base_urls base_urls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.base_urls
    ADD CONSTRAINT base_urls_pkey PRIMARY KEY (id);


--
-- Name: entities entities_entity_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_entity_key_key UNIQUE (entity_key);


--
-- Name: entities entities_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entities
    ADD CONSTRAINT entities_pkey PRIMARY KEY (id);


--
-- Name: entity_fields entity_fields_entity_id_field_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_fields
    ADD CONSTRAINT entity_fields_entity_id_field_name_key UNIQUE (entity_id, field_name);


--
-- Name: entity_fields entity_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_fields
    ADD CONSTRAINT entity_fields_pkey PRIMARY KEY (id);


--
-- Name: entity_validations entity_validations_entity_field_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_validations
    ADD CONSTRAINT entity_validations_entity_field_id_key UNIQUE (entity_field_id);


--
-- Name: entity_validations entity_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_validations
    ADD CONSTRAINT entity_validations_pkey PRIMARY KEY (id);


--
-- Name: idx_base_urls_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_base_urls_active ON public.base_urls USING btree (is_active);


--
-- Name: idx_base_urls_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_base_urls_name ON public.base_urls USING btree (name);


--
-- Name: idx_entities_entity_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entities_entity_key ON public.entities USING btree (entity_key);


--
-- Name: idx_entity_fields_entity_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_fields_entity_id ON public.entity_fields USING btree (entity_id);


--
-- Name: idx_entity_fields_field_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_fields_field_name ON public.entity_fields USING btree (field_name);


--
-- Name: idx_entity_fields_sort_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_fields_sort_order ON public.entity_fields USING btree (entity_id, sort_order);


--
-- Name: idx_entity_validations_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_validations_active ON public.entity_validations USING btree (is_active);


--
-- Name: idx_entity_validations_entity_field_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_validations_entity_field_id ON public.entity_validations USING btree (entity_field_id);


--
-- Name: idx_entity_validations_lookup_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_validations_lookup_id ON public.entity_validations USING btree (lookup_id) WHERE (lookup_id IS NOT NULL);


--
-- Name: idx_entity_validations_validation_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_entity_validations_validation_type ON public.entity_validations USING btree (validation_type);


--
-- Name: entity_validations trigger_update_entity_validations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_entity_validations_updated_at BEFORE UPDATE ON public.entity_validations FOR EACH ROW EXECUTE FUNCTION public.update_entity_validations_updated_at();


--
-- Name: base_urls update_base_urls_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_base_urls_updated_at BEFORE UPDATE ON public.base_urls FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entities update_entities_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_entities_updated_at BEFORE UPDATE ON public.entities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_fields update_entity_fields_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_entity_fields_updated_at BEFORE UPDATE ON public.entity_fields FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: entity_fields entity_fields_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_fields
    ADD CONSTRAINT entity_fields_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.entities(id) ON DELETE CASCADE;


--
-- Name: entity_validations entity_validations_entity_field_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.entity_validations
    ADD CONSTRAINT entity_validations_entity_field_id_fkey FOREIGN KEY (entity_field_id) REFERENCES public.entity_fields(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict uW8MfAA6cp0xvnW6s9inCFfjb3NPCSQiGbhX5zvjn3hrK0bqYO4WVsOI8cKrAbG

